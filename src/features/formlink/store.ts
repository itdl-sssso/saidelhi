// Drafts, send queue, offline photos and cached form payloads for /f/ links,
// keyed by a hash of the link token (the token itself is never stored).
// Pure logic over a KvStore so it is unit-tested with MemoryKv.
import type { AnswerMap, FormDefinition, FormPayload, Submission } from "@/contract";
import type { KvStore } from "./kv";
import { applyReadOnly, sameAnswers } from "./model";

export interface StoredFile {
  /** Server attachment id, or `local-…` while the photo is only on this phone. */
  id: string;
  name: string;
  size: number;
  mime: string;
}

export interface Draft {
  key: string;
  linkKey: string;
  definitionId: string;
  definitionVersion: number;
  answers: AnswerMap;
  /** File metadata per file-field id, for showing names next to attachment ids. */
  files: Record<string, StoredFile[]>;
  /** Stable per draft: every retry of the first send reuses it (CONTRACT §2 idempotency). */
  idempotencyKey: string;
  /** Set once the server has the submission; later sends are PATCHes. */
  submissionId: string | null;
  submissionVersion: number | null;
  /** Section the coordinator was on, to resume there. */
  sectionIndex: number;
  /** Edited since the last successful send. */
  dirty: boolean;
  updatedAt: string;
  sentAt: string | null;
}

export interface QueueEntry {
  /** One pending send per draft: the newest snapshot replaces an older one. */
  id: string;
  linkKey: string;
  draftKey: string;
  kind: "create" | "patch";
  answers: AnswerMap;
  idempotencyKey: string;
  submissionId: string | null;
  version: number | null;
  queuedAt: string;
  attempts: number;
  /** ISO time before which the queue should not retry (429/503 retryAfter, backoff). */
  notBefore: string | null;
  lastError: string | null;
}

export interface PendingFile {
  key: string;
  linkKey: string;
  fieldId: string;
  name: string;
  mime: string;
  size: number;
  blob: Blob;
  idempotencyKey: string;
}

export interface CachedPayload {
  linkKey: string;
  locale: string;
  payload: FormPayload;
  savedAt: string;
}

// ---- Keys --------------------------------------------------------------------

function fnv1a(s: string): string {
  // 2×32-bit FNV-1a, only when WebCrypto isn't available (plain-http LAN testing).
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193 ^ 0x5bd1e995;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ c, 0x5bd1e995) >>> 0;
  }
  return h1.toString(16).padStart(8, "0") + h2.toString(16).padStart(8, "0");
}

/** Storage key for a link: sha-256(token), so drafts never contain the token. */
export async function linkKeyOf(token: string): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (subtle) {
    const buf = await subtle.digest("SHA-256", new TextEncoder().encode(`f-link:${token}`));
    return [...new Uint8Array(buf)].slice(0, 16).map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  return fnv1a(`f-link:${token}`);
}

export const draftKeyOf = (linkKey: string, def: Pick<FormDefinition, "id" | "version">) => `${linkKey}|${def.id}|${def.version}`;

/** UUID v4 from getRandomValues (works outside secure contexts, unlike randomUUID). */
export function newKey(): string {
  const b = new Uint8Array(16);
  globalThis.crypto.getRandomValues(b);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

// ---- Draft lifecycle ------------------------------------------------------------

export type DraftOrigin = "new" | "resumed" | "server" | "local-over-server";

export interface InitialDraft {
  draft: Draft;
  origin: DraftOrigin;
  /** Local unsent edits sit on an older server version (someone else edited): offer "load latest". */
  stale: boolean;
}

function fromServer(base: Omit<Draft, "answers" | "files" | "submissionId" | "submissionVersion" | "dirty" | "sentAt">, existing: Submission, prefill: AnswerMap, def: FormDefinition, files: Draft["files"]): Draft {
  return {
    ...base,
    answers: applyReadOnly(def, existing.answers, prefill),
    files,
    submissionId: existing.id,
    submissionVersion: existing.version,
    dirty: false,
    sentAt: existing.submittedAt,
  };
}

/**
 * Picks the draft to show when the form opens: unsent local work wins (it is
 * what the coordinator typed, possibly offline); otherwise the server's
 * submission; otherwise the event prefill.
 */
export function initialDraft(args: { linkKey: string; payload: FormPayload; stored: Draft | undefined; now: Date }): InitialDraft {
  const { linkKey, payload, stored, now } = args;
  const def = payload.definition;
  const key = draftKeyOf(linkKey, def);
  const existing = payload.existing;
  const base = {
    key,
    linkKey,
    definitionId: def.id,
    definitionVersion: def.version,
    idempotencyKey: stored?.idempotencyKey ?? newKey(),
    sectionIndex: stored?.sectionIndex ?? 0,
    updatedAt: now.toISOString(),
  };

  if (existing) {
    if (stored && stored.dirty && (stored.submissionId === existing.id || stored.submissionId === null)) {
      // Keep what was typed here. If the server moved on meanwhile, say so.
      const stale = stored.submissionId === null || stored.submissionVersion !== existing.version;
      const keepSame = stored.submissionId === existing.id && !stale;
      return {
        draft: {
          ...stored,
          answers: applyReadOnly(def, stored.answers, payload.prefill),
          submissionId: existing.id,
          submissionVersion: keepSame ? stored.submissionVersion : existing.version,
        },
        origin: "local-over-server",
        stale: stale && !sameAnswers(stored.answers, existing.answers),
      };
    }
    return { draft: fromServer(base, existing, payload.prefill, def, stored?.submissionId === existing.id ? stored.files : {}), origin: "server", stale: false };
  }

  if (stored) {
    return { draft: { ...stored, answers: applyReadOnly(def, stored.answers, payload.prefill) }, origin: "resumed", stale: false };
  }
  return {
    draft: { ...base, answers: { ...payload.prefill }, files: {}, submissionId: null, submissionVersion: null, dirty: false, sentAt: null },
    origin: "new",
    stale: false,
  };
}

/** After the server accepted a send. */
export function markSent(d: Draft, s: Submission, sentAnswers: AnswerMap, now: Date): Draft {
  return {
    ...d,
    submissionId: s.id,
    submissionVersion: s.version,
    // Still dirty if the coordinator kept typing while the send was in flight.
    dirty: !sameAnswers(d.answers, sentAnswers),
    sentAt: s.submittedAt ?? now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

// ---- Store ---------------------------------------------------------------------

export class FormStore {
  constructor(private readonly kv: KvStore) {}

  get persistent() {
    return this.kv.persistent;
  }

  getDraft(key: string) {
    return this.kv.get<Draft>("drafts", key);
  }
  saveDraft(d: Draft) {
    return this.kv.put("drafts", d.key, d);
  }
  deleteDraft(key: string) {
    return this.kv.delete("drafts", key);
  }

  async getPayload(linkKey: string, locale: string): Promise<CachedPayload | undefined> {
    return (await this.kv.get<CachedPayload>("payloads", `${linkKey}|${locale}`)) ?? (await this.kv.get<CachedPayload>("payloads", `${linkKey}|${locale === "hi" ? "en" : "hi"}`));
  }
  savePayload(linkKey: string, locale: string, payload: FormPayload, now: Date) {
    return this.kv.put<CachedPayload>("payloads", `${linkKey}|${locale}`, { linkKey, locale, payload, savedAt: now.toISOString() });
  }

  // Queue
  async enqueue(d: Draft, answers: AnswerMap, now: Date): Promise<QueueEntry> {
    const prev = await this.kv.get<QueueEntry>("queue", d.key);
    const entry: QueueEntry = {
      id: d.key,
      linkKey: d.linkKey,
      draftKey: d.key,
      kind: d.submissionId ? "patch" : "create",
      answers,
      idempotencyKey: d.idempotencyKey,
      submissionId: d.submissionId,
      version: d.submissionVersion,
      queuedAt: prev?.queuedAt ?? now.toISOString(),
      attempts: prev?.attempts ?? 0,
      notBefore: null,
      lastError: null,
    };
    await this.kv.put("queue", entry.id, entry);
    return entry;
  }
  async pending(linkKey: string): Promise<QueueEntry[]> {
    return (await this.kv.all<QueueEntry>("queue")).filter((e) => e.linkKey === linkKey).sort((a, b) => (a.queuedAt < b.queuedAt ? -1 : 1));
  }
  putEntry(e: QueueEntry) {
    return this.kv.put("queue", e.id, e);
  }
  getEntry(id: string) {
    return this.kv.get<QueueEntry>("queue", id);
  }
  dequeue(id: string) {
    return this.kv.delete("queue", id);
  }
  async deferEntry(id: string, error: string, notBefore: Date | null) {
    const e = await this.kv.get<QueueEntry>("queue", id);
    if (!e) return;
    await this.kv.put("queue", id, { ...e, attempts: e.attempts + 1, lastError: error, notBefore: notBefore?.toISOString() ?? null });
  }

  // Offline photos
  putFile(f: PendingFile) {
    return this.kv.put("files", f.key, f);
  }
  getFile(key: string) {
    return this.kv.get<PendingFile>("files", key);
  }
  deleteFile(key: string) {
    return this.kv.delete("files", key);
  }
}

/** Backoff for network/5xx retries: 5 s, 15 s, 45 s … capped at 5 minutes. */
export const backoffMs = (attempts: number) => Math.min(5 * 60_000, 5_000 * 3 ** Math.max(0, attempts));
