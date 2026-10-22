import { describe, expect, it } from "vitest";
import type { AnswerMap, FormPayload, LinkAttachment, Submission } from "@/contract";
import { eyeCampReport } from "@/server/forms/definitions";
import { MemoryKv } from "@/features/formlink/kv";
import { classifyFailure, dueEntries, sendEntry, swapFileIds, type SendApi } from "@/features/formlink/outbox";
import { backoffMs, draftKeyOf, FormStore, initialDraft, linkKeyOf, markSent, newKey } from "@/features/formlink/store";
import type { ApiResult } from "@/lib/api";
import { EYE_ANSWERS } from "./support/forms";

const NOW = new Date("2026-10-20T10:00:00Z");
const later = (ms: number) => new Date(NOW.getTime() + ms);

const event = {
  id: "ev1",
  title: { en: "Eye camp", hi: null },
  sevaType: "eye",
  startsAt: "2026-10-17T04:00:00.000Z",
  venue: { name: "Hall", address: "", geo: null },
  samithi: { id: "s", slug: "s", name: { en: "S", hi: null } },
  district: { id: "d", slug: "d", name: { en: "D", hi: null } },
} as unknown as FormPayload["event"];

const payload = (over: Partial<FormPayload> = {}): FormPayload => ({
  purpose: "report",
  event,
  definition: eyeCampReport,
  prefill: { samithi: "Mayur Vihar", date: "2026-10-17" },
  existing: null,
  editable: true,
  ...over,
});

const submission = (over: Partial<Submission> = {}): Submission =>
  ({ id: "sub1", eventId: "ev1", linkId: "l1", definitionVersion: 1, answers: EYE_ANSWERS, submittedAt: NOW.toISOString(), submittedBy: "", source: "form", status: "submitted", version: 1, ...over }) as Submission;

const ok = <T>(data: T, status = 200): ApiResult<T> => ({ ok: true, status, data });
const fail = (status: number, code = "INTERNAL", extra: object = {}): ApiResult<never> => ({ ok: false, status, error: { code: code as never, message: `${code} ${status}`, ...extra } });

class FakeApi implements SendApi {
  calls: string[] = [];
  keys: string[] = [];
  createResults: ApiResult<Submission>[] = [];
  patchResults: ApiResult<Submission>[] = [];
  uploadResults: ApiResult<LinkAttachment>[] = [];
  currentValue: Submission | null = null;
  async create(_a: AnswerMap, key: string) {
    this.calls.push("create");
    this.keys.push(key);
    return this.createResults.shift() ?? ok(submission(), 201);
  }
  async patch() {
    this.calls.push("patch");
    return this.patchResults.shift() ?? ok(submission({ version: 2 }));
  }
  async upload() {
    this.calls.push("upload");
    return this.uploadResults.shift() ?? ok({ id: "att1", fieldId: "register_photo", name: "p.png", mime: "image/png", size: 3, uploadedAt: NOW.toISOString() });
  }
  async current() {
    return this.currentValue;
  }
}

async function setup() {
  const store = new FormStore(new MemoryKv());
  const linkKey = await linkKeyOf("tok");
  const { draft } = initialDraft({ linkKey, payload: payload(), stored: undefined, now: NOW });
  const api = new FakeApi();
  return { store, linkKey, draft, api, deps: { store, api, now: () => NOW } };
}

describe("link and draft keys", () => {
  it("hashes the token and never stores it", async () => {
    const a = await linkKeyOf("secret-token");
    expect(a).toMatch(/^[0-9a-f]{32}$/);
    expect(a).not.toContain("secret");
    expect(await linkKeyOf("secret-token")).toBe(a);
    expect(await linkKeyOf("other")).not.toBe(a);
  });

  it("keys drafts per link and form version", () => {
    expect(draftKeyOf("k", { id: "f", version: 1 })).not.toBe(draftKeyOf("k", { id: "f", version: 2 }));
  });

  it("makes v4 uuids", () => {
    expect(newKey()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});

describe("initialDraft", () => {
  it("starts from the event prefill", () => {
    const r = initialDraft({ linkKey: "k", payload: payload(), stored: undefined, now: NOW });
    expect(r.origin).toBe("new");
    expect(r.draft.answers).toMatchObject({ samithi: "Mayur Vihar", date: "2026-10-17" });
    expect(r.draft.idempotencyKey).toBeTruthy();
  });

  it("resumes unsent local work with the same idempotency key", () => {
    const first = initialDraft({ linkKey: "k", payload: payload(), stored: undefined, now: NOW }).draft;
    const stored = { ...first, answers: { ...first.answers, volunteers: 9 }, dirty: true, sectionIndex: 3 };
    const r = initialDraft({ linkKey: "k", payload: payload(), stored, now: later(1000) });
    expect(r.origin).toBe("resumed");
    expect(r.draft.answers.volunteers).toBe(9);
    expect(r.draft.idempotencyKey).toBe(first.idempotencyKey);
    expect(r.draft.sectionIndex).toBe(3);
  });

  it("shows the server's submission when nothing is pending locally", () => {
    const r = initialDraft({ linkKey: "k", payload: payload({ existing: submission() }), stored: undefined, now: NOW });
    expect(r.origin).toBe("server");
    expect(r.draft).toMatchObject({ submissionId: "sub1", submissionVersion: 1, dirty: false });
  });

  it("keeps local edits over the server copy and flags a newer server version", () => {
    const stored = { ...initialDraft({ linkKey: "k", payload: payload(), stored: undefined, now: NOW }).draft, answers: { ...EYE_ANSWERS, volunteers: 99 }, dirty: true, submissionId: "sub1", submissionVersion: 1 };
    const r = initialDraft({ linkKey: "k", payload: payload({ existing: submission({ version: 3 }) }), stored, now: NOW });
    expect(r.origin).toBe("local-over-server");
    expect(r.stale).toBe(true);
    expect(r.draft.submissionVersion).toBe(3);
    expect(r.draft.answers.volunteers).toBe(99);
  });

  it("never lets a read-only prefill be overridden by stored answers", () => {
    const first = initialDraft({ linkKey: "k", payload: payload(), stored: undefined, now: NOW }).draft;
    const r = initialDraft({ linkKey: "k", payload: payload(), stored: { ...first, answers: { ...first.answers, samithi: "Hacked" }, dirty: true }, now: NOW });
    expect(r.draft.answers.samithi).toBe("Mayur Vihar");
  });

  it("markSent stays dirty when edits continued during the send", () => {
    const { draft } = initialDraft({ linkKey: "k", payload: payload(), stored: undefined, now: NOW });
    const sent = { ...draft.answers };
    expect(markSent(draft, submission(), sent, NOW)).toMatchObject({ dirty: false, submissionId: "sub1", submissionVersion: 1 });
    expect(markSent({ ...draft, answers: { ...sent, volunteers: 5 } }, submission(), sent, NOW).dirty).toBe(true);
  });
});

describe("send queue", () => {
  it("keeps one entry per draft (newest snapshot wins) with a stable key", async () => {
    const { store, linkKey, draft } = await setup();
    await store.enqueue(draft, { a: 1 }, NOW);
    const second = await store.enqueue(draft, { a: 2 }, later(5000));
    const pending = await store.pending(linkKey);
    expect(pending).toHaveLength(1);
    expect(pending[0]).toMatchObject({ answers: { a: 2 }, idempotencyKey: draft.idempotencyKey, kind: "create", queuedAt: NOW.toISOString() });
    expect(second.id).toBe(draft.key);
  });

  it("a network failure keeps the entry and retries with the SAME Idempotency-Key", async () => {
    const { store, linkKey, draft, api, deps } = await setup();
    await store.enqueue(draft, EYE_ANSWERS, NOW);
    api.createResults.push(fail(0));
    const [entry] = await store.pending(linkKey);
    const out = await sendEntry(entry, deps);
    expect(out.kind).toBe("deferred");
    expect(await store.pending(linkKey)).toHaveLength(1);

    // Not due yet; due after the backoff.
    expect(await dueEntries(store, linkKey, NOW)).toHaveLength(0);
    const due = await dueEntries(store, linkKey, later(backoffMs(0) + 1));
    expect(due).toHaveLength(1);

    const sent = await sendEntry(due[0], deps);
    expect(sent.kind).toBe("sent");
    expect(api.keys).toEqual([draft.idempotencyKey, draft.idempotencyKey]);
    expect(await store.pending(linkKey)).toHaveLength(0);
  });

  it("honours retryAfter on 429/503", async () => {
    const { store, linkKey, draft, api, deps } = await setup();
    await store.enqueue(draft, EYE_ANSWERS, NOW);
    api.createResults.push(fail(429, "RATE_LIMITED", { retryAfter: 60 }));
    const out = await sendEntry((await store.pending(linkKey))[0], deps);
    expect(out).toMatchObject({ kind: "deferred", reason: "retry" });
    if (out.kind === "deferred") expect(out.retryAt.getTime() - NOW.getTime()).toBe(60_000);
  });

  it("uploads photos taken offline first and swaps their ids", async () => {
    const { store, linkKey, draft, api } = await setup();
    await store.putFile({ key: "local-1", linkKey, fieldId: "register_photo", name: "p.png", mime: "image/png", size: 3, blob: new Blob(["abc"]), idempotencyKey: "u1" });
    await store.enqueue(draft, { ...EYE_ANSWERS, register_photo: ["local-1"] }, NOW);
    const uploaded: string[] = [];
    const out = await sendEntry((await store.pending(linkKey))[0], { store, api, now: () => NOW, onFileUploaded: (k, a) => void uploaded.push(`${k}>${a.id}`) });
    expect(api.calls).toEqual(["upload", "create"]);
    expect(uploaded).toEqual(["local-1>att1"]);
    expect(out.kind === "sent" && out.entry.answers.register_photo).toEqual(["att1"]);
    expect(await store.getFile("local-1")).toBeUndefined();
  });

  it("does not re-upload photos on a retry after the photo landed", async () => {
    const { store, linkKey, draft, api, deps } = await setup();
    await store.putFile({ key: "local-1", linkKey, fieldId: "register_photo", name: "p.png", mime: "image/png", size: 3, blob: new Blob(["abc"]), idempotencyKey: "u1" });
    await store.enqueue(draft, { ...EYE_ANSWERS, register_photo: ["local-1"] }, NOW);
    api.createResults.push(fail(0));
    await sendEntry((await store.pending(linkKey))[0], deps);
    const retry = (await dueEntries(store, linkKey, later(10 * 60_000)))[0];
    expect(retry.answers.register_photo).toEqual(["att1"]);
    await sendEntry(retry, deps);
    expect(api.calls.filter((c) => c === "upload")).toHaveLength(1);
  });

  it("422 returns field errors and drops the entry", async () => {
    const { store, linkKey, draft, api, deps } = await setup();
    await store.enqueue(draft, EYE_ANSWERS, NOW);
    api.createResults.push(fail(422, "VALIDATION_FAILED", { fields: { "followup.0.name": "This is required." } }));
    const out = await sendEntry((await store.pending(linkKey))[0], deps);
    expect(out).toMatchObject({ kind: "invalid", fields: { "followup.0.name": "This is required." } });
    expect(await store.pending(linkKey)).toHaveLength(0);
  });

  it("401 keeps the entry so the draft survives re-verification", async () => {
    const { store, linkKey, draft, api, deps } = await setup();
    await store.enqueue(draft, EYE_ANSWERS, NOW);
    api.createResults.push(fail(401, "UNAUTHENTICATED"));
    expect((await sendEntry((await store.pending(linkKey))[0], deps)).kind).toBe("auth");
    expect(await store.pending(linkKey)).toHaveLength(1);
  });

  it("409 on a PATCH that actually landed counts as sent; a real clash does not", async () => {
    const { store, linkKey, draft, api, deps } = await setup();
    const patching = { ...draft, submissionId: "sub1", submissionVersion: 1 };
    await store.enqueue(patching, EYE_ANSWERS, NOW);
    api.patchResults.push(fail(409, "CONFLICT"));
    api.currentValue = submission({ version: 2 });
    const landed = await sendEntry((await store.pending(linkKey))[0], deps);
    expect(landed).toMatchObject({ kind: "sent", replayed: true });

    await store.enqueue(patching, { ...EYE_ANSWERS, volunteers: 1 }, NOW);
    api.patchResults.push(fail(409, "CONFLICT"));
    const clash = await sendEntry((await store.pending(linkKey))[0], deps);
    expect(clash.kind).toBe("conflict");
  });

  it("410 returns the link details for the spec 22 page", async () => {
    const { store, linkKey, draft, api, deps } = await setup();
    await store.enqueue(draft, EYE_ANSWERS, NOW);
    api.createResults.push(fail(410, "LINK_EXPIRED", { details: { link: { state: "expired" } } }));
    const out = await sendEntry((await store.pending(linkKey))[0], deps);
    expect(out).toMatchObject({ kind: "gone", code: "LINK_EXPIRED", link: { state: "expired" } });
  });
});

describe("failure classification", () => {
  it.each([
    [0, "offline"],
    [401, "auth"],
    [409, "conflict"],
    [422, "invalid"],
    [410, "gone"],
    [404, "gone"],
    [403, "forbidden"],
    [429, "retry"],
    [503, "retry"],
    [500, "retry"],
    [400, "fatal"],
  ])("%i -> %s", (status, kind) => {
    expect(classifyFailure({ ok: false, status, error: { code: "INTERNAL", message: "x" } }).kind).toBe(kind);
  });

  it("swaps only known local ids", () => {
    expect(swapFileIds({ f: ["local-1", "att9", "local-2"], n: 3 }, new Map([["local-1", "att1"]]))).toEqual({ f: ["att1", "att9", "local-2"], n: 3 });
  });

  it("backs off 5 s, 15 s, 45 s up to 5 minutes", () => {
    expect([0, 1, 2, 9].map(backoffMs)).toEqual([5000, 15000, 45000, 300000]);
  });
});
