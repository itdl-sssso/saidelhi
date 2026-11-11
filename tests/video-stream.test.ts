// Cloudflare Stream video library: adapter (fetch mocked), webhook signature, SRT->VTT, service flow.
import { describe, expect, it, vi } from "vitest";
import { CloudflareStream, signStreamWebhook, verifyStreamSignature } from "@/server/providers/video/cloudflare";
import { MOCK_WEBHOOK_HEADER } from "@/server/providers/video/mock";
import { toVtt } from "@/server/providers/video/vtt";
import { USER } from "@/server/mock/fixtures";
import { errCode, m6Setup } from "./support/m6";

const SECRET = "whsec_test_secret";
const cfg = { accountId: "acct1", apiToken: "tok_test", customerCode: "abc123", webhookSecret: SECRET };

describe("toVtt", () => {
  it("converts SRT", () => {
    const out = toVtt("﻿1\r\n00:00:01,000 --> 00:00:03,500\r\nनमस्ते\r\n\r\n2\r\n00:00:04,000 --> 00:00:05,000\r\nHello\r\n");
    expect(out.startsWith("WEBVTT\n\n")).toBe(true);
    expect(out).toContain("00:00:01.000 --> 00:00:03.500\nनमस्ते");
    expect(out).not.toMatch(/^1$/m);
    expect(out).not.toContain(",");
  });
  it("keeps VTT, rejects junk", () => {
    expect(toVtt("WEBVTT\n\n00:01.000 --> 00:02.000\nHi\n")).toContain("WEBVTT");
    expect(() => toVtt("just some text")).toThrow();
    expect(() => toVtt("WEBVTT\n\nnothing")).toThrow();
  });
});

describe("CloudflareStream adapter", () => {
  it("createUpload sends tus headers with the API token and returns uid + Location", async () => {
    const f = vi.fn(async () => new Response(null, { status: 201, headers: { location: "https://upload.cloudflarestream.com/tus-url?tusv2=true", "stream-media-id": "uid123" } }));
    const cf = new CloudflareStream({ ...cfg, fetch: f as unknown as typeof fetch });
    const r = await cf.createUpload({ name: "Episode 1", sizeBytes: 1_500_000_000, maxDurationS: 10800 });
    expect(r).toEqual({ uid: "uid123", uploadUrl: "https://upload.cloudflarestream.com/tus-url?tusv2=true" });
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.cloudflare.com/client/v4/accounts/acct1/stream?direct_user=true");
    const h = init.headers as Record<string, string>;
    expect(h.Authorization).toBe("Bearer tok_test");
    expect(h["Tus-Resumable"]).toBe("1.0.0");
    expect(h["Upload-Length"]).toBe("1500000000");
    expect(h["Upload-Metadata"]).toContain(`maxDurationSeconds ${Buffer.from("10800").toString("base64")}`);
    expect(init.method).toBe("POST");
  });

  it("createUpload falls back to the uid in the Location path and maps failures to PROVIDER_UNAVAILABLE", async () => {
    const ok = new CloudflareStream({ ...cfg, fetch: (async () => new Response(null, { status: 201, headers: { location: "https://upload.cloudflarestream.com/abc999?tusv2=true" } })) as unknown as typeof fetch });
    expect((await ok.createUpload({ name: "x", sizeBytes: 10, maxDurationS: 60 })).uid).toBe("abc999");
    const bad = new CloudflareStream({ ...cfg, fetch: (async () => new Response("no", { status: 403 })) as unknown as typeof fetch });
    expect(await errCode(bad.createUpload({ name: "x", sizeBytes: 10, maxDurationS: 60 }))).toBe("PROVIDER_UNAVAILABLE");
  });

  it("getVideo maps states; urls use the customer code", async () => {
    const body = (status: object, extra: object = {}) => new Response(JSON.stringify({ result: { duration: 1800, readyToStream: true, status, ...extra } }), { status: 200 });
    let next = body({ state: "ready" });
    const cf = new CloudflareStream({ ...cfg, fetch: (async () => next) as unknown as typeof fetch });
    expect(await cf.getVideo("u")).toEqual({ state: "ready", durationS: 1800, errorReason: null });
    next = body({ state: "inprogress" }, { readyToStream: false });
    expect((await cf.getVideo("u"))?.state).toBe("processing");
    next = body({ state: "error", errorReasonCode: "ERR_MALFORMED_VIDEO" });
    expect(await cf.getVideo("u")).toMatchObject({ state: "error", errorReason: "ERR_MALFORMED_VIDEO" });
    next = new Response("{}", { status: 404 });
    expect(await cf.getVideo("u")).toBeNull();
    expect(cf.iframeUrl("u1")).toBe("https://customer-abc123.cloudflarestream.com/u1/iframe");
    expect(cf.posterUrl("u1", 42)).toBe("https://customer-abc123.cloudflarestream.com/u1/thumbnails/thumbnail.jpg?height=720&time=42s");
  });

  it("uploadCaptions PUTs multipart WebVTT; deleteVideo tolerates 404", async () => {
    const f = vi.fn(async () => new Response("{}", { status: 200 }));
    const cf = new CloudflareStream({ ...cfg, fetch: f as unknown as typeof fetch });
    await cf.uploadCaptions("u1", "hi", "WEBVTT\n");
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.cloudflare.com/client/v4/accounts/acct1/stream/u1/captions/hi");
    expect(init.method).toBe("PUT");
    expect(init.body).toBeInstanceOf(FormData);
    const del = new CloudflareStream({ ...cfg, fetch: (async () => new Response("", { status: 404 })) as unknown as typeof fetch });
    await expect(del.deleteVideo("gone")).resolves.toBeUndefined();
  });
});

describe("webhook signature", () => {
  const body = JSON.stringify({ uid: "u1", readyToStream: true, status: { state: "ready" }, duration: 60 });
  const now = 1_800_000_000_000;
  const t = now / 1000;

  it("accepts a fresh, correctly signed delivery", () => {
    expect(verifyStreamSignature(body, signStreamWebhook(body, SECRET, t), SECRET, now)).toBe(true);
  });
  it("rejects wrong secret, tampered body, missing/garbled header", () => {
    const sig = signStreamWebhook(body, SECRET, t);
    expect(verifyStreamSignature(body, signStreamWebhook(body, "other", t), SECRET, now)).toBe(false);
    expect(verifyStreamSignature(body + " ", sig, SECRET, now)).toBe(false);
    expect(verifyStreamSignature(body, null, SECRET, now)).toBe(false);
    expect(verifyStreamSignature(body, "time=abc,sig1=zz", SECRET, now)).toBe(false);
    expect(verifyStreamSignature(body, sig, "", now)).toBe(false);
  });
  it("rejects a replayed delivery outside the time window", () => {
    const old = signStreamWebhook(body, SECRET, t - 3600);
    expect(verifyStreamSignature(body, old, SECRET, now)).toBe(false);
    expect(verifyStreamSignature(body, signStreamWebhook(body, SECRET, t + 3600), SECRET, now)).toBe(false);
  });
  it("adapter parses status payloads", () => {
    const cf = new CloudflareStream(cfg);
    expect(cf.parseWebhook(body)).toEqual({ uid: "u1", state: "ready", durationS: 60, errorReason: null });
    expect(cf.parseWebhook("nope")).toBeNull();
    expect(cf.parseWebhook("{}")).toBeNull();
  });
});

describe("video library service", () => {
  const article = (video: string) => ({ kind: "article" as const, category: "golden-stories", title: { en: "Episode 1", hi: null }, bodyHtml: { en: "<p>Story.</p>", hi: null }, video }) as never;
  const hook = (uid: string, state = "ready") => JSON.stringify({ uid, state, duration: 1800 });

  it("create -> unready hides the video -> webhook ready exposes it", async () => {
    const t = m6Setup();
    const ed = await t.actor(USER.contentD);
    const v = await t.svc.portal.videos.create(ed, { title: { en: "Episode 1", hi: null }, fileName: "ep1.mp4", sizeBytes: 1_000_000_000 });
    expect(v.status).toBe("uploading");
    expect(v.uploadUrl).toMatch(/video-upload\//);

    const a = await t.svc.portal.content.create(ed, article(`cf:${v.id}`));
    if (a.kind !== "article") throw new Error("article");
    expect(a.video).toMatchObject({ provider: "cloudflare", id: v.id });
    await t.svc.portal.content.patch(ed, a.id, { status: "published", version: a.version });
    expect((await t.svc.articles.bySlug(a.slug))?.video).toBeNull();

    // forged delivery is refused, a signed one marks it ready (twice = same result)
    const uid = (await t.repo.m6.docGet<{ providerUid: string }>("video", v.id))!.data.providerUid;
    expect(await errCode(t.svc.portal.videos.handleWebhook(hook(uid), "bad"))).toBe("FORBIDDEN");
    await t.svc.portal.videos.handleWebhook(hook(uid), MOCK_WEBHOOK_HEADER);
    await t.svc.portal.videos.handleWebhook(hook(uid), MOCK_WEBHOOK_HEADER);
    const pub = (await t.svc.articles.bySlug(a.slug))?.video;
    expect(pub).toMatchObject({ provider: "cloudflare", id: v.id, uid, durationS: 1800, captions: [] });

    // a late "processing" delivery never un-readies it
    await t.svc.portal.videos.handleWebhook(hook(uid, "processing"), MOCK_WEBHOOK_HEADER);
    expect((await t.svc.portal.videos.get(ed, v.id)).status).toBe("ready");
    // unknown uids are acknowledged
    await expect(t.svc.portal.videos.handleWebhook(hook("nope"), MOCK_WEBHOOK_HEADER)).resolves.toBeUndefined();
  });

  it("captions: srt -> vtt, listed on the public video; delete blocked while an article uses it", async () => {
    const t = m6Setup();
    const ed = await t.actor(USER.contentD);
    const v = await t.svc.portal.videos.create(ed, { title: { en: "Ep", hi: null }, fileName: "e.mp4", sizeBytes: 10 });
    const file = { name: "hi.srt", bytes: new TextEncoder().encode("1\n00:00:01,000 --> 00:00:02,000\nनमस्ते\n") };
    expect(await errCode(t.svc.portal.videos.addCaptions(ed, v.id, "hi", file))).toBe("CONFLICT"); // not ready yet
    const uid = (await t.repo.m6.docGet<{ providerUid: string }>("video", v.id))!.data.providerUid;
    await t.svc.portal.videos.handleWebhook(hook(uid), MOCK_WEBHOOK_HEADER);
    const withCaps = await t.svc.portal.videos.addCaptions(ed, v.id, "hi", file);
    expect(withCaps.captions).toEqual([{ lang: "hi", label: "हिन्दी" }]);
    expect(await errCode(t.svc.portal.videos.addCaptions(ed, v.id, "en", { name: "x.txt", bytes: new Uint8Array([65]) }))).toBe("VALIDATION_FAILED");

    const a = await t.svc.portal.content.create(ed, article(`cf:${v.id}`));
    if (a.kind !== "article") throw new Error("article");
    await t.svc.portal.content.patch(ed, a.id, { status: "published", version: a.version });
    expect((await t.svc.articles.bySlug(a.slug))?.video).toMatchObject({ captions: ["hi"] });
    expect(await errCode(t.svc.portal.videos.remove(ed, v.id))).toBe("CONFLICT");
    const cur = await t.svc.portal.content.get(ed, a.id);
    if (cur.kind !== "article") throw new Error("article");
    await t.svc.portal.content.patch(ed, a.id, { video: "", version: cur.version });
    await t.svc.portal.videos.remove(ed, v.id);
    expect(await errCode(t.svc.portal.videos.get(ed, v.id))).toBe("NOT_FOUND");
  });

  it("rejects an unknown library video on the article and enforces RBAC", async () => {
    const t = m6Setup();
    const ed = await t.actor(USER.contentD);
    expect(await errCode(t.svc.portal.content.create(ed, article("cf:does-not-exist")))).toBe("VALIDATION_FAILED");
    const coord = await t.actor(USER.coordA);
    expect(await errCode(t.svc.portal.videos.list(coord, { page: 1, pageSize: 25 }))).toBe("FORBIDDEN");
    expect(await errCode(t.svc.portal.videos.create(coord, { title: { en: "x", hi: null }, fileName: "x", sizeBytes: 5 }))).toBe("FORBIDDEN");
    const tr = await t.actor(USER.translatorE);
    expect(await errCode(t.svc.portal.videos.get(tr, "x"))).toBe("FORBIDDEN");
  });
});
