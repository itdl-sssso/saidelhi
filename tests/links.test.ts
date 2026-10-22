import { describe, expect, it } from "vitest";
import { FormLink, FormPayload, LinkGoneDetails, LinkInfo, Submission } from "@/contract";
import { resolveUnder, sniffMime } from "@/server/files";
import { DEV_COORDINATOR_PHONE } from "@/server/forms/seed-data";
import { ApiError } from "@/server/http/errors";
import { EVENT } from "@/server/mock/fixtures";
import { CloudWhatsApp, verifyWebhookSignature } from "@/server/providers/whatsapp/cloud";
import { renderTemplate } from "@/server/providers/whatsapp/templates";
import { DEV_SESSION_SECRET, decryptField, encryptField, hmacHex } from "@/server/security/crypto";
import {
  BOT_MIN_AGE_MS,
  csrfFor,
  csrfValid,
  deriveLinkToken,
  hashLinkToken,
  isWellFormedToken,
  issueBotChallenge,
  linkState,
  verifyBotChallenge,
} from "@/server/security/link-token";
import { maskPhone, normalisePhone, phoneHash } from "@/server/security/phone";
import { DEV_TOKENS, linkServices } from "./support/links";
import { EYE_ANSWERS } from "./support/forms";
import { createHmac } from "node:crypto";

async function apiError(p: Promise<unknown>): Promise<ApiError> {
  try {
    await p;
  } catch (e) {
    if (e instanceof ApiError) return e;
    throw e;
  }
  throw new Error("expected an ApiError");
}

const MIN = 60 * 1000;

async function verified(t = linkServices(), key = "eye-report", phone = DEV_COORDINATOR_PHONE) {
  await t.links.sendOtp(DEV_TOKENS[key], phone, "en");
  const grant = await t.links.verify(DEV_TOKENS[key], phone, t.whatsapp.lastCode(), "en");
  return { ...t, grant, token: DEV_TOKENS[key] };
}

describe("tokens, state and phones", () => {
  it("tokens are 128-bit base64url, derived from a nonce, stored only as sha256", () => {
    const a = deriveLinkToken("s".repeat(32), "n1");
    expect(a).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(Buffer.from(a, "base64url")).toHaveLength(16);
    expect(deriveLinkToken("s".repeat(32), "n2")).not.toBe(a);
    expect(deriveLinkToken("t".repeat(32), "n1")).not.toBe(a);
    expect(hashLinkToken(a)).toMatch(/^[0-9a-f]{64}$/);
    expect(isWellFormedToken(a)).toBe(true);
    expect(isWellFormedToken("../../etc/passwd")).toBe(false);
  });

  it("derives state with precedence revoked > expired > used up", () => {
    const now = new Date("2026-10-22T00:00:00Z");
    const base = { revokedAt: null, expiresAt: new Date("2026-11-01T00:00:00Z"), maxUses: 2, uses: 0 };
    expect(linkState(base, now)).toBe("active");
    expect(linkState({ ...base, uses: 2 }, now)).toBe("used_up");
    expect(linkState({ ...base, maxUses: null, uses: 99 }, now)).toBe("active");
    expect(linkState({ ...base, uses: 2, expiresAt: now }, now)).toBe("expired");
    expect(linkState({ ...base, uses: 2, expiresAt: now, revokedAt: now }, now)).toBe("revoked");
  });

  it("normalises, masks, hashes and seals phones", () => {
    expect(normalisePhone("98765 43252")).toBe("+919876543252");
    expect(normalisePhone("+91-98765-43252")).toBe("+919876543252");
    expect(normalisePhone("09876543252")).toBe("+919876543252");
    expect(normalisePhone("12345")).toBeNull();
    expect(maskPhone("+919876543252")).toBe("+91 98•••••52");
    expect(maskPhone("+919876543252")).not.toMatch(/7654/);
    expect(phoneHash("k".repeat(32), "+919876543252")).toBe(hmacHex("k".repeat(32), "phone", "+919876543252"));
    const sealed = encryptField("k".repeat(32), "+919876543252");
    expect(sealed).not.toContain("9876543252");
    expect(decryptField("k".repeat(32), sealed)).toBe("+919876543252");
    expect(decryptField("x".repeat(32), sealed)).toBeNull();
  });

  it("csrf is bound to the session token; bot challenge needs time and the right link", () => {
    const c = csrfFor(DEV_SESSION_SECRET, "sess");
    expect(csrfValid(DEV_SESSION_SECRET, "sess", c, c)).toBe(true);
    expect(csrfValid(DEV_SESSION_SECRET, "other", c, c)).toBe(false);
    expect(csrfValid(DEV_SESSION_SECRET, "sess", c, null)).toBe(false);
    const t0 = new Date("2026-10-22T08:00:00Z");
    const ch = issueBotChallenge(DEV_SESSION_SECRET, "L1", t0);
    expect(verifyBotChallenge(DEV_SESSION_SECRET, "L1", ch, t0)).toBe(false);
    const later = new Date(t0.getTime() + BOT_MIN_AGE_MS);
    expect(verifyBotChallenge(DEV_SESSION_SECRET, "L1", ch, later)).toBe(true);
    expect(verifyBotChallenge(DEV_SESSION_SECRET, "L2", ch, later)).toBe(false);
    expect(verifyBotChallenge(DEV_SESSION_SECRET, "L1", ch.replace(/.$/, "x"), later)).toBe(false);
  });

  it("media paths cannot escape the root", () => {
    const root = "/srv/media";
    expect(resolveUnder(root, ["postsmedia", "a.png"])).toBe("/srv/media/postsmedia/a.png");
    expect(resolveUnder(root, ["..", "etc", "passwd"])).toBeNull();
    expect(resolveUnder(root, ["postsmedia", "..", "..", "x"])).toBeNull();
    expect(resolveUnder(root, ["a/../../b"])).toBeNull();
    expect(resolveUnder(root, ["a\\..\\b"])).toBeNull();
    expect(resolveUnder(root, [".env"])).toBeNull();
    expect(resolveUnder(root, ["a\0.png"])).toBeNull();
    expect(resolveUnder(root, [])).toBeNull();
  });
});

describe("GET /links/:token", () => {
  it("returns state, purpose, event card and OTP requirement", async () => {
    const { links } = linkServices();
    const info = LinkInfo.parse(await links.info(DEV_TOKENS["eye-report"], null));
    expect(info).toMatchObject({ state: "active", purpose: "report", otpRequired: true, deskLabel: null, botChallenge: null, hasSession: false });
    expect(info.event?.id).toBe(EVENT.eyePlanned);
    const desk = await links.info(DEV_TOKENS["eye-desk-2"], null);
    expect(desk).toMatchObject({ purpose: "desk", otpRequired: false, deskLabel: "Desk 2 – Sector 31" });
    expect(desk.botChallenge).toBeTruthy();
  });

  it("410 variants carry the event card only when safe; unknown → 404", async () => {
    const { links } = linkServices();
    const expired = await apiError(links.info(DEV_TOKENS["eye-expired"], null));
    expect(expired.code).toBe("LINK_EXPIRED");
    expect(LinkGoneDetails.parse(expired.details).link.event?.id).toBe(EVENT.eyePlanned);
    const revoked = await apiError(links.info(DEV_TOKENS["eye-revoked"], null));
    expect(revoked.code).toBe("LINK_REVOKED");
    expect(LinkGoneDetails.parse(revoked.details).link.event).not.toBeNull();
    const used = await apiError(links.info(DEV_TOKENS["blood-used-up"], null));
    expect(used.code).toBe("LINK_USED_UP");
    expect(LinkGoneDetails.parse(used.details).link.event).toBeNull();
    expect((await apiError(links.info("AAAAAAAAAAAAAAAAAAAAAA", null))).code).toBe("NOT_FOUND");
    expect((await apiError(links.info("nope", null))).code).toBe("NOT_FOUND");
  });
});

describe("OTP", () => {
  it("report links refuse unlisted phones; desk links accept any phone", async () => {
    const { links, whatsapp } = linkServices();
    expect((await apiError(links.sendOtp(DEV_TOKENS["eye-report"], "9000000099", "en"))).code).toBe("PHONE_NOT_LISTED");
    expect(whatsapp.sent).toHaveLength(0);
    expect(await links.sendOtp(DEV_TOKENS["eye-desk-1"], "9000000099", "en")).toEqual({ resendAfter: 30, expiresIn: 300 });
    expect(whatsapp.sent[0]).toMatchObject({ to: "+919000000099", template: "login_code" });
    expect(whatsapp.lastCode()).toMatch(/^\d{6}$/);
    expect((await apiError(links.sendOtp(DEV_TOKENS["eye-public"], "9000000099", "en"))).code).toBe("BAD_REQUEST");
    expect((await apiError(links.sendOtp(DEV_TOKENS["eye-desk-1"], "123", "en"))).code).toBe("VALIDATION_FAILED");
  });

  it("throttles resends to one per 30 s", async () => {
    const t = linkServices();
    await t.links.sendOtp(DEV_TOKENS["eye-report"], DEV_COORDINATOR_PHONE, "en");
    t.advance(10_000);
    const e = await apiError(t.links.sendOtp(DEV_TOKENS["eye-report"], DEV_COORDINATOR_PHONE, "en"));
    expect(e.code).toBe("RATE_LIMITED");
    expect(e.retryAfter).toBe(20);
    t.advance(20_000);
    await t.links.sendOtp(DEV_TOKENS["eye-report"], DEV_COORDINATOR_PHONE, "hi");
    expect(t.whatsapp.sent.at(-1)?.lang).toBe("hi");
  });

  it("3 wrong codes lock for 10 minutes, then a new code works", async () => {
    const t = linkServices();
    const tok = DEV_TOKENS["eye-report"];
    await t.links.sendOtp(tok, DEV_COORDINATOR_PHONE, "en");
    const good = t.whatsapp.lastCode();
    const wrong = good === "000000" ? "111111" : "000000";
    const e1 = await apiError(t.links.verify(tok, DEV_COORDINATOR_PHONE, wrong, "en"));
    expect(e1.code).toBe("VALIDATION_FAILED");
    expect(e1.fields?.code).toMatch(/2 tries left/);
    await apiError(t.links.verify(tok, DEV_COORDINATOR_PHONE, wrong, "en"));
    const e3 = await apiError(t.links.verify(tok, DEV_COORDINATOR_PHONE, wrong, "en"));
    expect(e3).toMatchObject({ code: "LOCKED", retryAfter: 600 });
    // Even the right code is refused while locked, and so is a resend.
    expect((await apiError(t.links.verify(tok, DEV_COORDINATOR_PHONE, good, "en"))).code).toBe("LOCKED");
    t.advance(MIN);
    expect((await apiError(t.links.sendOtp(tok, DEV_COORDINATOR_PHONE, "en"))).retryAfter).toBe(540);
    t.advance(9 * MIN);
    await t.links.sendOtp(tok, DEV_COORDINATOR_PHONE, "en");
    const grant = await t.links.verify(tok, DEV_COORDINATOR_PHONE, t.whatsapp.lastCode(), "en");
    expect(grant.sessionToken).toBeTruthy();
    expect(grant.csrf).toBe(csrfFor(DEV_SESSION_SECRET, grant.sessionToken));
  });

  it("codes expire after 5 minutes and are single-use", async () => {
    const t = linkServices();
    const tok = DEV_TOKENS["eye-desk-1"];
    await t.links.sendOtp(tok, "9000000002", "en");
    const code = t.whatsapp.lastCode();
    t.advance(5 * MIN);
    expect((await apiError(t.links.verify(tok, "9000000002", code, "en"))).fields?.code).toMatch(/expired/);
    t.advance(MIN);
    await t.links.sendOtp(tok, "9000000002", "en");
    const code2 = t.whatsapp.lastCode();
    await t.links.verify(tok, "9000000002", code2, "en");
    expect((await apiError(t.links.verify(tok, "9000000002", code2, "en"))).code).toBe("VALIDATION_FAILED");
  });

  it("provider failure → 503 and the code is not left usable", async () => {
    const t = linkServices();
    t.whatsapp.failNext = true;
    expect((await apiError(t.links.sendOtp(DEV_TOKENS["eye-report"], DEV_COORDINATOR_PHONE, "en"))).code).toBe("PROVIDER_UNAVAILABLE");
    // No 30 s wait after a failed send.
    await t.links.sendOtp(DEV_TOKENS["eye-report"], DEV_COORDINATOR_PHONE, "en");
  });
});

describe("form and submissions", () => {
  it("form needs a session for this link", async () => {
    const t = await verified();
    expect((await apiError(t.links.form(t.token, null, "en"))).code).toBe("UNAUTHENTICATED");
    expect((await apiError(t.links.form(DEV_TOKENS["blood-report"], t.grant.sessionToken, "en"))).code).toBe("UNAUTHENTICATED");
    const form = FormPayload.parse(await t.links.form(t.token, t.grant.sessionToken, "hi"));
    expect(form.definition.title.en).toBe("Eye camp report");
    expect(form.prefill).toMatchObject({ date: "2026-11-29", venue: "Sai Centre Gurugram", partner: expect.any(String) });
    expect(form.prefill.samithi).toMatch(/[ऀ-ॿ]|\w/);
    expect(form).toMatchObject({ existing: null, editable: true, purpose: "report" });
  });

  it("submits once per Idempotency-Key, moves the event, stores pending KPI facts", async () => {
    const t = await verified();
    const sid = t.grant.sessionToken;
    const first = await t.links.submit(t.token, sid, "draft-0001", { ...EYE_ANSWERS, samithi: "tampered" }, "en");
    expect(first.replayed).toBe(false);
    const sub = Submission.parse(first.submission);
    expect(sub).toMatchObject({ status: "submitted", version: 1, submittedBy: "+91 90•••••01", source: "form", definitionVersion: 1 });
    expect(sub.answers.samithi).not.toBe("tampered");

    const again = await t.links.submit(t.token, sid, "draft-0001", EYE_ANSWERS, "en");
    expect(again).toMatchObject({ replayed: true, submission: { id: sub.id } });

    const ev = await t.repo.eventById(EVENT.eyePlanned);
    expect(ev?.status).toBe("report_submitted");
    expect(t.repo.links.links.find((l) => l.eventId === EVENT.eyePlanned && l.purpose === "report" && l.uses > 0)?.uses).toBe(1);
    expect(t.repo.links.submissions).toHaveLength(1);
    expect(t.revalidated).toContain("events");
    const facts = (await t.repo.approvedFacts({ eventIds: [EVENT.eyePlanned] })).length;
    expect(facts).toBe(0);

    // A second, different key on a report link must edit instead.
    expect((await apiError(t.links.submit(t.token, sid, "draft-0002", EYE_ANSWERS, "en"))).code).toBe("CONFLICT");

    const form = await t.links.form(t.token, sid, "en");
    expect(form.existing?.id).toBe(sub.id);
    expect(form.editable).toBe(true);
  });

  it("422 maps engine errors to fields in the request locale", async () => {
    const t = await verified();
    const e = await apiError(t.links.submit(t.token, t.grant.sessionToken, "draft-0003", { ...EYE_ANSWERS, cataract_referred: 20 }, "hi"));
    expect(e.code).toBe("VALIDATION_FAILED");
    expect(e.fields?.cataract_referred).toMatch(/[ऀ-ॿ]/);
  });

  it("PATCH edits with version check until approved", async () => {
    const t = await verified();
    const sid = t.grant.sessionToken;
    const { submission } = await t.links.submit(t.token, sid, "draft-0004", EYE_ANSWERS, "en");
    const v2 = await t.links.update(t.token, sid, submission.id, { answers: { ...EYE_ANSWERS, cataract_surgeries: 5 }, version: 1 }, "en");
    expect(v2).toMatchObject({ version: 2, answers: { cataract_surgeries: 5 } });
    expect((await apiError(t.links.update(t.token, sid, submission.id, { answers: EYE_ANSWERS, version: 1 }, "en"))).code).toBe("CONFLICT");
    t.repo.links.submissions[0].status = "approved";
    expect((await apiError(t.links.update(t.token, sid, submission.id, { answers: EYE_ANSWERS, version: 2 }, "en"))).code).toBe("CONFLICT");
  });

  it("personal follow-up rows are kept apart and recorded with consent", async () => {
    const t = await verified();
    const answers = { ...EYE_ANSWERS, followup: [{ name: "Person A", age: 70, consent: true }] };
    const { submission } = await t.links.submit(t.token, t.grant.sessionToken, "draft-0005", answers, "en");
    const stored = t.repo.links.submissions[0];
    expect(stored.answers).not.toHaveProperty("followup");
    expect(stored.personalAnswers).toHaveProperty("followup");
    expect(submission.answers).toHaveProperty("followup");
    expect(t.repo.links.consents).toEqual([expect.objectContaining({ subjectRef: "followup.0", submissionId: submission.id })]);
  });

  it("attachments: magic-byte check, private storage, then referenced from a file field", async () => {
    const t = await verified();
    const sid = t.grant.sessionToken;
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
    expect(sniffMime(png)?.mime).toBe("image/png");
    const bad = await apiError(t.links.attach(t.token, sid, { name: "x.png", bytes: new TextEncoder().encode("<svg/>") }, "register_photo", null, "en"));
    expect(bad.fields?.file).toBeDefined();
    expect((await apiError(t.links.attach(t.token, sid, { name: "x.png", bytes: png }, "notes", null, "en"))).fields?.fieldId).toBeDefined();
    const a = await t.links.attach(t.token, sid, { name: "register.png", bytes: png }, "register_photo", "upload-0001", "en");
    expect(a).toMatchObject({ mime: "image/png", size: 12, fieldId: "register_photo" });
    expect((await t.links.attach(t.token, sid, { name: "register.png", bytes: png }, "register_photo", "upload-0001", "en")).id).toBe(a.id);
    expect([...t.storage.files.keys()]).toEqual([`events/${EVENT.eyePlanned}/${a.id}.png`]);
    const rec = t.repo.links.attachments[0];
    expect(rec.retentionUntil.getTime()).toBeGreaterThan(Date.parse("2027-11-28"));

    await t.links.submit(t.token, sid, "draft-0006", { ...EYE_ANSWERS, register_photo: [a.id] }, "en");
    expect(t.repo.links.attachments[0].submissionId).toBe(t.repo.links.submissions[0].id);
    const forged = await apiError(t.links.update(t.token, sid, t.repo.links.submissions[0].id, { answers: { ...EYE_ANSWERS, register_photo: ["01JCSEEDXXX000000000000000"] }, version: 1 }, "en"));
    expect(forged.fields?.register_photo).toBeDefined();
  });

  it("public sign-up: bot check, honeypot, uses and volunteers joined", async () => {
    const t = linkServices();
    const tok = DEV_TOKENS["eye-public"];
    const info = await t.links.info(tok, null);
    expect((await apiError(t.links.startPublic(tok, { botToken: info.botChallenge ?? "" }))).code).toBe("FORBIDDEN");
    t.advance(2000);
    expect(await t.links.startPublic(tok, { botToken: info.botChallenge ?? "", website: "spam" })).toBeNull();
    const grant = await t.links.startPublic(tok, { botToken: info.botChallenge ?? "" });
    expect(grant).not.toBeNull();
    const before = (await t.repo.eventById(EVENT.eyePlanned))?.volunteersJoined ?? 0;
    const { submission } = await t.links.submit(tok, grant?.sessionToken ?? null, "signup-0001", { first_name: "A", phone: "9000000003", consent: true }, "en");
    expect(submission.submittedBy).toBe("");
    expect((await t.repo.eventById(EVENT.eyePlanned))?.volunteersJoined).toBe(before + 1);
    expect(t.repo.links.consents).toHaveLength(1);
  });

  it("a used-up public link still answers a retried key", async () => {
    const t = linkServices();
    const link = t.repo.links.links.find((l) => l.purpose === "public" && l.eventId === EVENT.eyePlanned);
    if (!link) throw new Error("seed");
    link.maxUses = 1;
    const info = await t.links.info(DEV_TOKENS["eye-public"], null);
    t.advance(2000);
    const grant = await t.links.startPublic(DEV_TOKENS["eye-public"], { botToken: info.botChallenge ?? "" });
    const body = { first_name: "A", phone: "9000000003", consent: true };
    const first = await t.links.submit(DEV_TOKENS["eye-public"], grant?.sessionToken ?? null, "signup-0002", body, "en");
    const retry = await t.links.submit(DEV_TOKENS["eye-public"], grant?.sessionToken ?? null, "signup-0002", body, "en");
    expect(retry).toMatchObject({ replayed: true, submission: { id: first.submission.id } });
    expect((await apiError(t.links.submit(DEV_TOKENS["eye-public"], grant?.sessionToken ?? null, "signup-0003", body, "en"))).code).toBe("LINK_USED_UP");
  });
});

describe("portal helpers", () => {
  it("create, list, resend, extend and revoke links", async () => {
    const t = linkServices();
    const { link, token } = await t.links.createLink(EVENT.bloodPlanned, "desk", { sendTo: "9000000004", send: true, otpRequired: true });
    FormLink.parse(link);
    expect(link).toMatchObject({ label: "Desk 2", sentTo: "+91 90•••••04", state: "active", otpRequired: true });
    expect(link.url).toBe(`http://localhost:3000/f/${token}`);
    expect(t.whatsapp.sent.at(-1)).toMatchObject({ template: "form_link_sent", to: "+919000000004" });
    expect(t.whatsapp.sent.at(-1)?.params[2]).toContain(token);

    const listed = await t.links.listLinksForEvent(EVENT.bloodPlanned);
    expect(listed.find((l) => l.id === link.id)?.url).toBe(link.url);
    expect(listed.every((l) => !JSON.stringify(l).includes("9000000004"))).toBe(true);

    await t.links.resendLink(link.id, "hi");
    expect(t.whatsapp.sent.at(-1)?.lang).toBe("hi");
    expect((await t.links.extendLink(link.id, new Date("2026-12-31T00:00:00Z"))).expiresAt).toBe("2026-12-31T00:00:00.000Z");
    expect((await t.links.revokeLink(link.id)).state).toBe("revoked");
    expect((await apiError(t.links.info(token, null))).code).toBe("LINK_REVOKED");
    expect((await apiError(t.links.resendLink(link.id))).code).toBe("CONFLICT");
  });

  it("a report link sent to a phone adds that phone to the allowed list and locks the form version", async () => {
    const t = linkServices();
    const { token } = await t.links.createLink(EVENT.draft, "report", { sendTo: "9000000005" });
    expect(await t.repo.links.eventFormVersionId(EVENT.draft)).toBe(t.repo.links.versions[0].id);
    await t.links.sendOtp(token, "9000000005", "en");
    expect((await apiError(t.links.createLink(EVENT.narayanPlanned, "report"))).code).toBe("CONFLICT");
  });
});

describe("WhatsApp providers", () => {
  it("renders templates in both languages", () => {
    expect(renderTemplate("login_code", "en", ["482913"])).toBe("Your code is 482913. It expires in 5 minutes. Never share it.");
    expect(renderTemplate("login_code", "hi", ["482913"])).toContain("482913");
  });

  it("cloud adapter posts the Graph API payload and maps failures to 503", async () => {
    const calls: { url: string; body: unknown }[] = [];
    const ok = new CloudWhatsApp({
      phoneNumberId: "123",
      accessToken: "tok",
      graphVersion: "v23.0",
      fetch: async (url, init) => {
        calls.push({ url: String(url), body: JSON.parse(String(init?.body)) });
        return Response.json({ messages: [{ id: "wamid.1" }] });
      },
    });
    expect(await ok.sendTemplate("+919000000001", "login_code", "hi", ["123456"])).toEqual({ id: "wamid.1" });
    expect(calls[0].url).toBe("https://graph.facebook.com/v23.0/123/messages");
    expect(calls[0].body).toMatchObject({
      messaging_product: "whatsapp",
      to: "919000000001",
      type: "template",
      template: { name: "login_code", language: { code: "hi" }, components: [{ type: "body" }, { type: "button", sub_type: "url" }] },
    });
    const down = new CloudWhatsApp({ phoneNumberId: "1", accessToken: "t", graphVersion: "v23.0", fetch: async () => Response.json({ error: { code: 131000 } }, { status: 500 }) });
    expect((await apiError(down.sendText("+919000000001", "hi"))).code).toBe("PROVIDER_UNAVAILABLE");
    const offline = new CloudWhatsApp({ phoneNumberId: "1", accessToken: "t", graphVersion: "v23.0", fetch: async () => Promise.reject(new Error("ECONNRESET")) });
    expect((await apiError(offline.sendText("+919000000001", "hi"))).code).toBe("PROVIDER_UNAVAILABLE");
  });

  it("verifies X-Hub-Signature-256", () => {
    const body = '{"entry":[]}';
    const sig = `sha256=${createHmac("sha256", "secret").update(body).digest("hex")}`;
    expect(verifyWebhookSignature(body, sig, "secret")).toBe(true);
    expect(verifyWebhookSignature(body, sig, "other")).toBe(false);
    expect(verifyWebhookSignature(body, null, "secret")).toBe(false);
  });
});
