// WhatsApp admin, broadcasts, opt-in, webhook and reminder rules (spec 42, contract v0.5 #5, #6, §5.5).
import { createHmac } from "node:crypto";
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it } from "vitest";
import { ApiError } from "@/server/http/errors";
import { resetEnvCache } from "@/server/env";
import { verifyWebhookSignature } from "@/server/providers/whatsapp";
import { DISTRICT, SAMITHI } from "@/server/mock/fixtures";
import { issueBotChallenge } from "@/server/security/link-token";
import { DEV_SESSION_SECRET } from "@/server/security/crypto";
import { parseWebhook } from "@/server/services/wa/webhook";
import { GET as webhookGet, POST as webhookPost } from "@/app/api/v1/whatsapp/webhook/route";
import { LoggedWhatsApp } from "@/server/providers/whatsapp";
import { MockRepo } from "@/server/repo/mock";
import { phoneHash } from "@/server/security/phone";
import { createServices } from "@/server/services/create";
import { FakeWhatsApp } from "./support/links";
import { EVENT, USER, phone, waSetup } from "./support/wa";

const code = async (p: Promise<unknown>) => p.then(() => "ok", (e: unknown) => (e instanceof ApiError ? e.code : "other"));

describe("admin tabs and permissions", () => {
  it("gives state admins every tab and district coordinators the reminders tab only", async () => {
    const t = waSetup();
    const state = await t.actor(USER.stateC);
    const east = await t.actor(USER.districtB);
    const coord = await t.actor(USER.coordA);

    const templates = await t.svc.wa.admin.templates(state);
    expect(templates.length).toBeGreaterThanOrEqual(10);
    expect(templates.find((x) => x.name === "login_code")).toMatchObject({ category: "otp", metaStatus: "approved" });
    expect(templates.every((x) => x.text.en.length > 0 && x.text.hi)).toBe(true);
    expect(await code(t.svc.wa.admin.templates(east))).toBe("FORBIDDEN");

    expect((await t.svc.wa.admin.reminders(east)).map((r) => r.key)).toEqual(["day_before", "day_after_no_report", "plus3_no_report", "plus7_no_report", "approval_day2"]);
    expect(await code(t.svc.wa.admin.reminders(coord))).toBe("FORBIDDEN");
    expect(await code(t.svc.wa.admin.status(east))).toBe("FORBIDDEN");
    expect(await code(t.svc.wa.admin.log(east, { page: 1, pageSize: 10 }))).toBe("FORBIDDEN");
  });

  it("toggles a reminder rule and audits it", async () => {
    const t = waSetup();
    const east = await t.actor(USER.districtB);
    const [first] = await t.svc.wa.admin.reminders(east);
    const off = await t.svc.wa.admin.patchReminder(east, first.id, { enabled: false });
    expect(off.enabled).toBe(false);
    expect((await t.svc.wa.admin.reminders(east))[0].enabled).toBe(false);
    expect((await t.repo.portal.listAudit({ action: "whatsapp.reminder_toggle", limit: 5, offset: 0 })).total).toBe(1);
    expect(await code(t.svc.wa.admin.patchReminder(east, "nope", { enabled: true }))).toBe("NOT_FOUND");
  });

  it("shows the conversation log masked and searchable, and audits thread views", async () => {
    const t = waSetup();
    const state = await t.actor(USER.stateC);
    const log = await t.svc.wa.admin.log(state, { page: 1, pageSize: 10 });
    expect(log.meta.total).toBeGreaterThanOrEqual(5);
    expect(log.data.every((c) => c.phone.includes("•"))).toBe(true);
    expect(JSON.stringify(log.data)).not.toContain("9000000001");
    const mayur = log.data.find((c) => c.who.label.includes("Coordinator A"))!;
    expect(mayur.who.label).toContain("Coordinator A");
    expect((await t.svc.wa.admin.log(state, { q: mayur.lastText.slice(0, 12), page: 1, pageSize: 10 })).data.map((c) => c.id)).toContain(mayur.id);
    const thread = await t.svc.wa.admin.conversation(state, mayur.id);
    expect(thread.thread.map((m) => m.dir)).toEqual(["in", "out"]);
    expect((await t.repo.portal.listAudit({ action: "whatsapp.view_thread", limit: 5, offset: 0 })).total).toBe(1);
    expect(await code(t.svc.wa.admin.conversation(state, "missing"))).toBe("NOT_FOUND");
  });

  it("reports number status with month totals and opted-in count", async () => {
    const t = waSetup();
    const state = await t.actor(USER.stateC);
    await t.svc.auth.requestOtp(phone(2), "whatsapp", "en");
    const s = await t.svc.wa.admin.status(state);
    expect(s).toMatchObject({ provider: "console", optedIn: 10 });
    expect(s.monthMessages).toBeGreaterThanOrEqual(0);
  });
});

describe("message log", () => {
  it("stores outbound messages but never a login code", async () => {
    const repo = new MockRepo();
    const fake = new FakeWhatsApp();
    const env = { secret: DEV_SESSION_SECRET, now: () => new Date("2026-10-22T08:00:00Z") };
    const svc = createServices(repo, { now: env.now, mediaBase: "/media", whatsapp: new LoggedWhatsApp(fake, repo.wa, env) });
    await svc.auth.requestOtp(phone(2), "whatsapp", "en");
    const code = fake.lastCode();
    const stored = await repo.wa.messages({ phoneHash: phoneHash(DEV_SESSION_SECRET, phone(2)) });
    const otp = stored.find((m) => m.template === "login_code")!;
    expect(otp).toBeTruthy();
    expect(JSON.stringify(otp)).not.toContain(code);
    expect(otp.text).toContain("••••••");
    expect(otp.costPaise).toBeGreaterThan(0);
    await svc.wa.handle({ from: phone(2), text: "menu", replyId: null, media: null });
    const after = await repo.wa.messages({ phoneHash: phoneHash(DEV_SESSION_SECRET, phone(2)) });
    expect(after.some((m) => m.dir === "in" && m.text === "menu")).toBe(true);
    expect(after.some((m) => m.dir === "out" && m.kind === "list")).toBe(true);
  });
});

describe("broadcasts", () => {
  it("estimates recipients and cost without sending, opted-in numbers only", async () => {
    const t = waSetup();
    const state = await t.actor(USER.stateC);
    const body = { districtIds: [] as string[], sevaTypes: [] as never[], text: { en: "Camp on Sunday", hi: null }, dryRun: true };
    const all = await t.svc.wa.admin.broadcast(state, body);
    expect(all).toEqual({ recipients: 10, estimatedCostInr: 7.8, sent: false, broadcastId: null });
    expect(t.whatsapp.sent).toHaveLength(0);
    // the pending and the stopped number are never counted
    const east = await t.svc.wa.admin.broadcast(state, { ...body, districtIds: [DISTRICT.east] });
    expect(east.recipients).toBe(5); // four East volunteers + one who asked for all of NCR
    const eye = await t.svc.wa.admin.broadcast(state, { ...body, sevaTypes: ["narayan_seva"] });
    expect(eye.recipients).toBeGreaterThan(0);
    expect(eye.recipients).toBeLessThan(10);
  });

  it("sends only to opted-in numbers in their language, audited, and refuses non-admins", async () => {
    const t = waSetup();
    const state = await t.actor(USER.stateC);
    const res = await t.svc.wa.admin.broadcast(state, { districtIds: [], sevaTypes: [], text: { en: "Camp on Sunday", hi: "रविवार को शिविर" }, dryRun: false });
    expect(res.sent).toBe(true);
    expect(res.broadcastId).toBeTruthy();
    const sent = t.whatsapp.sent.filter((s) => s.template === "seva_broadcast");
    expect(sent).toHaveLength(10);
    expect(sent.some((s) => s.lang === "hi" && s.params[1] === "रविवार को शिविर")).toBe(true);
    expect(sent.some((s) => s.lang === "en" && s.params[1] === "Camp on Sunday")).toBe(true);
    expect((await t.repo.portal.listAudit({ action: "whatsapp.broadcast", limit: 5, offset: 0 })).rows[0].data).toMatchObject({ recipients: 10, delivered: 10 });
    const east = await t.actor(USER.districtB);
    expect(await code(t.svc.wa.admin.broadcast(east, { districtIds: [], sevaTypes: [], text: { en: "x", hi: null }, dryRun: true }))).toBe("FORBIDDEN");
  });
});

describe("opt-in", () => {
  const botToken = (t: ReturnType<typeof waSetup>) => issueBotChallenge(DEV_SESSION_SECRET, "optin", new Date(t.clock.t.getTime() - 5000));
  const body = (t: ReturnType<typeof waSetup>) => ({ phone: "98123 45670", districtId: DISTRICT.east, sevaTypes: ["eye" as const], locale: "hi" as const, botToken: botToken(t) });

  it("sends a confirmation and records consent only when the person replies YES", async () => {
    const t = waSetup();
    await t.svc.wa.optin.request(body(t), { requestId: "r", ipHash: null });
    expect(t.whatsapp.sent.at(-1)).toMatchObject({ template: "optin_confirm", to: "+919812345670", lang: "hi" });
    expect(await t.repo.wa.optedInCount()).toBe(10); // not yet
    const reply = await t.say("+919812345670", "YES");
    expect(reply[0].text).toContain("धन्यवाद");
    expect(await t.repo.wa.optedInCount()).toBe(11);
    // and STOP takes it back
    await t.say("+919812345670", "stop");
    expect(await t.repo.wa.optedInCount()).toBe(10);
  });

  it("answers neutrally for a known number, rejects a bad bot token or phone", async () => {
    const t = waSetup();
    await t.svc.wa.optin.request(body(t), { requestId: "r", ipHash: null });
    await t.say("+919812345670", "YES");
    const sentBefore = t.whatsapp.sent.length;
    await expect(t.svc.wa.optin.request(body(t), { requestId: "r", ipHash: null })).resolves.toBeUndefined();
    expect(t.whatsapp.sent).toHaveLength(sentBefore); // nothing new to confirm
    expect(await code(t.svc.wa.optin.request({ ...body(t), botToken: "forged.token.value" }, { requestId: "r", ipHash: null }))).toBe("VALIDATION_FAILED");
    expect(await code(t.svc.wa.optin.request({ ...body(t), phone: "12" }, { requestId: "r", ipHash: null }))).toBe("VALIDATION_FAILED");
    const tooFast = issueBotChallenge(DEV_SESSION_SECRET, "optin", t.clock.t);
    expect(await code(t.svc.wa.optin.request({ ...body(t), botToken: tooFast }, { requestId: "r", ipHash: null }))).toBe("VALIDATION_FAILED");
  });

  it("limits confirmations per number", async () => {
    const t = waSetup();
    const results: string[] = [];
    for (let i = 0; i < 5; i++) results.push(await code(t.svc.wa.optin.request({ ...body(t), phone: "9812345671" }, { requestId: "r", ipHash: null })));
    expect(results.filter((r) => r === "RATE_LIMITED").length).toBeGreaterThan(0);
  });
});

describe("webhook", () => {
  const SECRET = "wa-app-secret";
  const payload = (id: string, extra: object) => ({ entry: [{ changes: [{ value: { messages: [{ from: "919000000002", id, ...extra }] } }] }] });

  afterEach(() => {
    delete process.env.WA_APP_SECRET;
    delete process.env.WA_VERIFY_TOKEN;
    resetEnvCache();
  });

  it("verifies Meta's X-Hub-Signature-256", () => {
    const raw = JSON.stringify(payload("a", { type: "text", text: { body: "hi" } }));
    const sig = `sha256=${createHmac("sha256", SECRET).update(raw).digest("hex")}`;
    expect(verifyWebhookSignature(raw, sig, SECRET)).toBe(true);
    expect(verifyWebhookSignature(raw + " ", sig, SECRET)).toBe(false);
    expect(verifyWebhookSignature(raw, sig.replace("sha256=", ""), SECRET)).toBe(false);
    expect(verifyWebhookSignature(raw, null, SECRET)).toBe(false);
    expect(verifyWebhookSignature(raw, `sha256=${"0".repeat(64)}`, SECRET)).toBe(false);
  });

  it("refuses unsigned or wrongly signed posts and answers the subscribe handshake", async () => {
    process.env.WA_APP_SECRET = SECRET;
    process.env.WA_VERIFY_TOKEN = "verify-me";
    resetEnvCache();
    const post = (headers: Record<string, string>) =>
      webhookPost(new NextRequest("http://localhost/api/v1/whatsapp/webhook", { method: "POST", body: "{}", headers }));
    expect((await post({})).status).toBe(403);
    expect((await post({ "x-hub-signature-256": "sha256=deadbeef" })).status).toBe(403);
    const ok = await webhookGet(new NextRequest("http://localhost/api/v1/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=verify-me&hub.challenge=12345"));
    expect(ok.status).toBe(200);
    expect(await ok.text()).toBe("12345");
    const bad = await webhookGet(new NextRequest("http://localhost/api/v1/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=nope&hub.challenge=1"));
    expect(bad.status).toBe(403);
  });

  it("refuses everything when no app secret is configured", async () => {
    resetEnvCache();
    const res = await webhookPost(new NextRequest("http://localhost/api/v1/whatsapp/webhook", { method: "POST", body: "{}", headers: { "x-hub-signature-256": "sha256=00" } }));
    expect(res.status).toBe(403);
  });

  it("parses texts, button/list replies and images, ignoring status updates", () => {
    const parsed = parseWebhook({
      entry: [
        {
          changes: [
            {
              value: {
                statuses: [{ id: "x", status: "delivered" }],
                messages: [
                  { from: "919000000002", id: "w1", type: "text", text: { body: "menu" } },
                  { from: "919000000002", id: "w2", type: "interactive", interactive: { type: "list_reply", list_reply: { id: "m:plan", title: "Plan" } } },
                  { from: "919000000002", id: "w3", type: "image", image: { id: "media-1234567890", mime_type: "image/jpeg", caption: "register" } },
                  { from: "919000000002", id: "w4", type: "audio", audio: { id: "a" } },
                ],
              },
            },
          ],
        },
      ],
    });
    expect(parsed.map((p) => [p.message.providerId, p.message.text, p.message.replyId, p.message.media?.kind ?? null])).toEqual([
      ["w1", "menu", null, null],
      ["w2", "Plan", "m:plan", null],
      ["w3", "register", null, "image"],
      ["w4", null, null, null],
    ]);
    expect(parsed[2].mediaId).toBe("media-1234567890");
  });

  it("runs messages through the bot once, even when Meta retries", async () => {
    const t = waSetup();
    const body = payload("wamid.A1", { type: "text", text: { body: "menu" } });
    expect(await t.svc.wa.handleWebhook(body)).toBe(1);
    expect(await t.svc.wa.handleWebhook(body)).toBe(0);
    expect(t.whatsapp.interactive.filter((m) => m.to === phone(2))).toHaveLength(1);
    // junk is ignored, never an error
    expect(await t.svc.wa.handleWebhook({ entry: "nope" })).toBe(0);
    expect(await t.svc.wa.handleWebhook(null)).toBe(0);
  });
});

describe("reminders honour the rules and are idempotent", () => {
  const run = (t: ReturnType<typeof waSetup>) => t.svc.portal.jobs.run("reminders");
  const dayBefore = (t: ReturnType<typeof waSetup>) => t.whatsapp.sent.filter((s) => s.template === "event_reminder_day_before");

  it("sends the day-before checklist once per event", async () => {
    const t = waSetup(new Date("2026-10-28T08:00:00Z")); // the bhajan event is on the 29th, Mayur Vihar
    const first = await run(t);
    expect(first.ids).toContain(EVENT.bhajanWeekly);
    expect(dayBefore(t).filter((s) => s.to === phone(1))).toHaveLength(1);
    const again = await run(t);
    expect(again.notified).toBe(0);
    expect(dayBefore(t).filter((s) => s.to === phone(1))).toHaveLength(1);
  });

  it("does nothing while the day-before rule is off, then sends once it is on", async () => {
    const t = waSetup(new Date("2026-10-30T08:00:00Z")); // study circle on the 31st, Laxmi Nagar
    const east = await t.actor(USER.districtB);
    const day = (await t.svc.wa.admin.reminders(east)).find((r) => r.key === "day_before")!;
    await t.svc.wa.admin.patchReminder(east, day.id, { enabled: false });
    expect((await run(t)).ids).not.toContain(EVENT.studyCircle);
    expect(dayBefore(t)).toHaveLength(0);
    await t.svc.wa.admin.patchReminder(east, day.id, { enabled: true });
    await run(t);
    expect(dayBefore(t).some((s) => s.to === phone(8))).toBe(true);
  });

  it("sends report reminders per rule, copying the district when the rule says so", async () => {
    const t = waSetup();
    const first = await run(t);
    expect(first.ids).toContain(EVENT.narayanMayurOverdue);
    const reminders = t.whatsapp.sent.filter((s) => s.template === "report_reminder");
    expect(reminders.some((s) => s.to === phone(1))).toBe(true); // the samithi coordinator
    expect(reminders.some((s) => s.to === phone(2))).toBe(true); // district copied by the +7 rule
    const count = reminders.length;
    expect((await run(t)).notified).toBe(0);
    expect(t.whatsapp.sent.filter((s) => s.template === "report_reminder")).toHaveLength(count);
  });

  it("skips reminders of switched-off rules and never replays them after re-enabling", async () => {
    const t = waSetup();
    const east = await t.actor(USER.districtB);
    const rules = await t.svc.wa.admin.reminders(east);
    for (const r of rules.filter((x) => x.key.endsWith("_no_report"))) await t.svc.wa.admin.patchReminder(east, r.id, { enabled: false });
    const off = await run(t);
    expect(t.whatsapp.sent.filter((s) => s.template === "report_reminder")).toHaveLength(0);
    expect(off.ids).not.toContain(EVENT.narayanMayurOverdue);
    for (const r of rules.filter((x) => x.key.endsWith("_no_report"))) await t.svc.wa.admin.patchReminder(east, r.id, { enabled: true });
    await run(t);
    expect(t.whatsapp.sent.filter((s) => s.template === "report_reminder")).toHaveLength(0);
  });

  it("keeps the approval reminder behind its own rule", async () => {
    const t = waSetup(new Date("2026-10-23T08:00:00Z"));
    const east = await t.actor(USER.districtB);
    const rule = (await t.svc.wa.admin.reminders(east)).find((r) => r.key === "approval_day2")!;
    await t.svc.wa.admin.patchReminder(east, rule.id, { enabled: false });
    await t.svc.portal.jobs.run("escalations");
    expect(t.whatsapp.sent.filter((s) => s.template === "plan_approval_request")).toHaveLength(0);
    expect(SAMITHI.mayurVihar).toBeTruthy();
  });
});
