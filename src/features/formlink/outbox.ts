// Sends queued drafts: uploads photos taken offline, then POST (with the draft's
// stable Idempotency-Key) or PATCH (with the version). Network errors keep the
// entry for a retry; server answers decide what the screen does next.
import type { AnswerMap, ApiErrorBody, LinkAttachment, LinkInfo, Submission } from "@/contract";
import type { ApiFailure, ApiResult } from "@/lib/api";
import { isLocalFileId, sameAnswers } from "./model";
import { backoffMs, type FormStore, type QueueEntry } from "./store";

export type FailureKind = "offline" | "retry" | "auth" | "invalid" | "conflict" | "gone" | "forbidden" | "fatal";

export interface Classified {
  kind: FailureKind;
  /** Milliseconds to wait before retrying (429/503 retryAfter, or backoff). */
  retryAfterMs?: number;
  error: ApiErrorBody;
}

/** Maps a failed API call to what the form app should do (CONTRACT §6). */
export function classifyFailure(f: ApiFailure): Classified {
  const e = f.error;
  if (f.status === 0) return { kind: "offline", error: e };
  if (f.status === 401) return { kind: "auth", error: e };
  if (f.status === 422) return { kind: "invalid", error: e };
  if (f.status === 409) return { kind: "conflict", error: e };
  if (f.status === 410 || f.status === 404) return { kind: "gone", error: e };
  if (f.status === 403) return { kind: "forbidden", error: e };
  if (f.status === 429 || f.status === 503 || f.status === 423) {
    return { kind: "retry", retryAfterMs: (e.retryAfter ?? 30) * 1000, error: e };
  }
  if (f.status >= 500 || f.status === 408) return { kind: "retry", error: e };
  return { kind: "fatal", error: e };
}

export type SendOutcome =
  | { kind: "sent"; submission: Submission; entry: QueueEntry; replayed: boolean }
  | { kind: "deferred"; reason: "offline" | "retry"; entry: QueueEntry; retryAt: Date }
  | { kind: "auth"; entry: QueueEntry }
  | { kind: "invalid"; entry: QueueEntry; fields: Record<string, string>; message: string }
  | { kind: "conflict"; entry: QueueEntry; message: string }
  | { kind: "gone"; entry: QueueEntry; code: string; link: LinkInfo | null }
  | { kind: "failed"; entry: QueueEntry; message: string }
  | { kind: "file-failed"; entry: QueueEntry; fieldId: string; fileKey: string; message: string };

export interface SendApi {
  create(answers: AnswerMap, idempotencyKey: string): Promise<ApiResult<Submission>>;
  patch(id: string, answers: AnswerMap, version: number): Promise<ApiResult<Submission>>;
  upload(file: Blob, name: string, fieldId: string, idempotencyKey: string): Promise<ApiResult<LinkAttachment>>;
  /** Current server copy, used to recognise a PATCH that did land before the connection dropped. */
  current(): Promise<Submission | null>;
}

export interface SendDeps {
  store: FormStore;
  api: SendApi;
  now: () => Date;
  /** Called when an offline photo got its server id, so the draft can be updated. */
  onFileUploaded?: (localKey: string, attachment: LinkAttachment) => Promise<void> | void;
}

/** Replaces `local-…` ids in file answers using `map` (unknown local ids stay). */
export function swapFileIds(answers: AnswerMap, map: ReadonlyMap<string, string>): AnswerMap {
  const out: AnswerMap = { ...answers };
  for (const [k, v] of Object.entries(out)) {
    if (Array.isArray(v) && v.some(isLocalFileId)) out[k] = v.map((x) => (isLocalFileId(x) ? (map.get(x) ?? x) : x));
  }
  return out;
}

const goneLink = (e: ApiErrorBody): LinkInfo | null => {
  const link = (e.details as { link?: LinkInfo } | undefined)?.link;
  return link ?? null;
};

/** Sends one queue entry. The entry is removed on success and on final answers (422/409/410); kept otherwise. */
export async function sendEntry(entry: QueueEntry, deps: SendDeps): Promise<SendOutcome> {
  const { store, api, now } = deps;

  const defer = async (c: Classified): Promise<SendOutcome> => {
    const wait = c.retryAfterMs ?? backoffMs(entry.attempts);
    const retryAt = new Date(now().getTime() + wait);
    await store.deferEntry(entry.id, c.error.message, retryAt);
    const updated = (await store.getEntry(entry.id)) ?? entry;
    return { kind: "deferred", reason: c.kind === "offline" ? "offline" : "retry", entry: updated, retryAt };
  };

  // 1. Photos taken offline go up first.
  const map = new Map<string, string>();
  for (const v of Object.values(entry.answers)) {
    if (!Array.isArray(v)) continue;
    for (const id of v) {
      if (!isLocalFileId(id) || map.has(id)) continue;
      const pf = await store.getFile(id);
      if (!pf) continue;
      const r = await api.upload(pf.blob, pf.name, pf.fieldId, pf.idempotencyKey);
      if (!r.ok) {
        const c = classifyFailure(r);
        if (c.kind === "offline" || c.kind === "retry") return defer(c);
        if (c.kind === "auth") return { kind: "auth", entry };
        return { kind: "file-failed", entry, fieldId: pf.fieldId, fileKey: id, message: c.error.message };
      }
      map.set(id, r.data.id);
      await deps.onFileUploaded?.(id, r.data);
      await store.deleteFile(id);
    }
  }
  const answers = map.size ? swapFileIds(entry.answers, map) : entry.answers;
  // Keep the swapped ids so a retry doesn't upload the photos again.
  if (map.size) await store.putEntry({ ...entry, answers });

  // 2. The submission.
  const res =
    entry.kind === "patch" && entry.submissionId && entry.version !== null
      ? await api.patch(entry.submissionId, answers, entry.version)
      : await api.create(answers, entry.idempotencyKey);

  if (res.ok) {
    await store.dequeue(entry.id);
    return { kind: "sent", submission: res.data, entry: { ...entry, answers }, replayed: false };
  }

  const c = classifyFailure(res);
  switch (c.kind) {
    case "offline":
    case "retry":
      return defer(c);
    case "auth":
      return { kind: "auth", entry };
    case "invalid":
      await store.dequeue(entry.id);
      return { kind: "invalid", entry, fields: c.error.fields ?? {}, message: c.error.message };
    case "conflict": {
      // A PATCH whose first attempt landed but whose answer was lost looks like a conflict: check.
      if (entry.kind === "patch") {
        const cur = await api.current().catch(() => null);
        if (cur && cur.id === entry.submissionId && sameAnswers(cur.answers, answers)) {
          await store.dequeue(entry.id);
          return { kind: "sent", submission: cur, entry, replayed: true };
        }
      }
      await store.dequeue(entry.id);
      return { kind: "conflict", entry, message: c.error.message };
    }
    case "gone":
      await store.dequeue(entry.id);
      return { kind: "gone", entry, code: c.error.code, link: goneLink(c.error) };
    default:
      await store.dequeue(entry.id);
      return { kind: "failed", entry, message: c.error.message };
  }
}

/** Entries of a link that are due now (respecting notBefore). */
export async function dueEntries(store: FormStore, linkKey: string, now: Date): Promise<QueueEntry[]> {
  return (await store.pending(linkKey)).filter((e) => !e.notBefore || Date.parse(e.notBefore) <= now.getTime());
}
