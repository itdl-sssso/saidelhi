// Review inbox (spec 28): RBAC and scope, every action, WhatsApp to the sender, audit.
import { describe, expect, it } from "vitest";
import { ApiError } from "@/server/http/errors";
import { EVENT, USER, phone, waSetup } from "./support/wa";

const IBX = (n: number) => `01JCSEEDIBX${String(n).padStart(15, "0")}`;
const code = async (p: Promise<unknown>) => p.then(() => "ok", (e: unknown) => (e instanceof ApiError ? e.code : "other"));

describe("inbox visibility", () => {
  it("lists by tab with counts, scoped to the district; states see everything", async () => {
    const t = waSetup();
    const east = await t.actor(USER.districtB);
    const forMe = await t.svc.wa.inbox.list(east, { tab: "for_me", page: 1, pageSize: 20 });
    expect(forMe.meta.counts).toEqual({ for_me: 3, escalated: 1, done: 1 });
    expect(forMe.data.map((r) => r.id).sort()).toEqual([IBX(1), IBX(2), IBX(3)]);
    const row = forMe.data.find((r) => r.id === IBX(1))!;
    expect(row.sender).toContain("•");
    expect(row.sender).not.toContain("9000000001");
    expect(row.matchedEvent?.id).toBe(EVENT.eyeMayurCamp);
    expect(row.preview).toContain("142 log aaye");
    expect(row.ageDays).toBe(0);
    const done = await t.svc.wa.inbox.list(east, { tab: "done", page: 1, pageSize: 20 });
    expect(done.data.map((r) => r.id)).toEqual([IBX(5)]);

    const state = await t.actor(USER.stateC);
    expect((await t.svc.wa.inbox.list(state, { tab: "escalated", page: 1, pageSize: 20 })).data.map((r) => r.id)).toEqual([IBX(4)]);
  });

  it("hides other districts' items as 404 and refuses roles without inbox.review", async () => {
    const t = waSetup();
    const north = await t.actor(USER.districtG);
    expect((await t.svc.wa.inbox.list(north, { tab: "for_me", page: 1, pageSize: 20 })).data).toEqual([]);
    expect(await code(t.svc.wa.inbox.get(north, IBX(1)))).toBe("NOT_FOUND");
    const editor = await t.actor(USER.contentD);
    expect(await code(t.svc.wa.inbox.list(editor, { tab: "for_me", page: 1, pageSize: 20 }))).toBe("FORBIDDEN");
  });

  it("lets a samithi coordinator look at their own items but not act on them", async () => {
    const t = waSetup();
    const a = await t.actor(USER.coordA);
    const list = await t.svc.wa.inbox.list(a, { tab: "for_me", page: 1, pageSize: 20 });
    expect(list.data.map((r) => r.id)).toEqual([IBX(1)]);
    const d = await t.svc.wa.inbox.get(a, IBX(1));
    expect(d.can).toEqual({ approve: false, edit: false, escalate: false, reject: false, ask: false });
    expect(await code(t.svc.wa.inbox.reject(a, IBX(1), { version: d.version, reason: "no thanks" }))).toBe("FORBIDDEN");
  });
});

describe("item detail", () => {
  it("shows thread, draft with confidence, candidates, definition and history", async () => {
    const t = waSetup();
    const east = await t.actor(USER.districtB);
    const d = await t.svc.wa.inbox.get(east, IBX(1));
    expect(d.source).toBe("whatsapp");
    expect(d.thread.map((m) => m.dir)).toEqual(["in", "out"]);
    expect(d.thread[0].text).toContain("142 log aaye");
    expect(d.matchedEvent?.id).toBe(EVENT.eyeMayurCamp);
    expect(d.candidates.map((c) => c.id)).toContain(EVENT.eyeMayurCamp);
    expect(d.definition?.sevaType).toBe("eye");
    expect(d.draft.answers).toMatchObject({ registered: 142, male: 60, female: 82, spectacles_total: 96 });
    expect(d.draft.fieldConfidence.registered.why?.en).toContain("142");
    expect(d.aiModel).toBe("rules");
    expect(d.history[0].action).toBe("ai_drafted");
    expect(d.can).toEqual({ approve: true, edit: true, escalate: true, reject: true, ask: true });
    const photo = await t.svc.wa.inbox.get(east, IBX(2));
    expect(photo.raw.kind).toBe("image");
    expect(photo.thread[0].media?.name).toBe("register-photo.png");
    expect(photo.matchedEvent).toBeNull();
    expect(photo.confidence).toBe("low");
  });
});

describe("actions", () => {
  it("edits answers and re-matches the event, with a stale version rejected", async () => {
    const t = waSetup();
    const east = await t.actor(USER.districtB);
    const d = await t.svc.wa.inbox.get(east, IBX(1));
    const edited = await t.svc.wa.inbox.patch(east, IBX(1), { version: d.version, answers: { registered: 150 } });
    expect(edited.draft.answers).toMatchObject({ registered: 150 });
    expect(edited.draft.fieldConfidence.registered.level).toBe("high");
    expect(edited.history.at(-1)?.action).toBe("edited");
    expect(edited.version).toBe(d.version + 1);
    expect(await code(t.svc.wa.inbox.patch(east, IBX(1), { version: d.version, answers: { registered: 1 } }))).toBe("CONFLICT");
    const rematched = await t.svc.wa.inbox.patch(east, IBX(2), { version: 1, eventId: EVENT.eyeMayurCamp });
    expect(rematched.matchedEvent?.id).toBe(EVENT.eyeMayurCamp);
    expect(rematched.history.at(-1)?.action).toBe("matched");
    expect(await code(t.svc.wa.inbox.patch(east, IBX(2), { version: 2, eventId: EVENT.balVikasRohiniEscalated }))).toBe("VALIDATION_FAILED");
  });

  it("approves into the event: a submission, the event moves on, the item is done, audited", async () => {
    const t = waSetup();
    const east = await t.actor(USER.districtB);
    const d = await t.svc.wa.inbox.get(east, IBX(1));
    const answers = { ...d.draft.answers, volunteers: 10, volunteer_hours: 40, p_1_0: 96 };
    const done = await t.svc.wa.inbox.approve(east, IBX(1), { version: d.version, eventId: EVENT.eyeMayurCamp, answers });
    expect(done.state).toBe("done");
    expect(done.history.at(-1)).toMatchObject({ action: "approved", by: { role: "district_coord", label: "District coordinator B" } });
    const subs = await t.repo.portal.submissionsForEvent(EVENT.eyeMayurCamp);
    expect(subs).toHaveLength(1);
    expect(subs[0]).toMatchObject({ source: "whatsapp", status: "submitted" });
    expect((await t.repo.eventById(EVENT.eyeMayurCamp))?.status).toBe("report_submitted");
    const audit = await t.repo.portal.listAudit({ action: "inbox.approve", limit: 10, offset: 0 });
    expect(audit.rows[0]).toMatchObject({ entityId: IBX(1), actorRole: "district_coord" });
    // done items are final
    expect(await code(t.svc.wa.inbox.reject(east, IBX(1), { version: done.version, reason: "too late" }))).toBe("FORBIDDEN");
  });

  it("refuses an invalid draft and an event that is not waiting for a report", async () => {
    const t = waSetup();
    const east = await t.actor(USER.districtB);
    const d = await t.svc.wa.inbox.get(east, IBX(1));
    expect(await code(t.svc.wa.inbox.approve(east, IBX(1), { version: d.version, eventId: EVENT.eyeMayurCamp, answers: { registered: -5 } }))).toBe("VALIDATION_FAILED");
    expect(await code(t.svc.wa.inbox.approve(east, IBX(1), { version: d.version, eventId: EVENT.eyeCamp, answers: d.draft.answers }))).toBe("CONFLICT");
    expect((await t.svc.wa.inbox.get(east, IBX(1))).state).toBe("for_me");
  });

  it("escalates once (district only); the state team can then approve", async () => {
    const t = waSetup();
    const east = await t.actor(USER.districtB);
    const d = await t.svc.wa.inbox.get(east, IBX(1));
    const up = await t.svc.wa.inbox.escalate(east, IBX(1), { version: d.version, note: "needs the data team" });
    expect(up.state).toBe("escalated");
    expect(up.can).toMatchObject({ approve: false, escalate: false });
    expect(await code(t.svc.wa.inbox.escalate(east, IBX(1), { version: up.version }))).toBe("FORBIDDEN");
    const state = await t.actor(USER.stateC);
    const view = await t.svc.wa.inbox.get(state, IBX(1));
    expect(view.can).toMatchObject({ approve: true, escalate: false });
    const done = await t.svc.wa.inbox.approve(state, IBX(1), { version: view.version, eventId: EVENT.eyeMayurCamp, answers: { ...view.draft.answers, volunteers: 10, volunteer_hours: 40, p_1_0: 96 } });
    expect(done.history.map((h) => h.action)).toEqual(["ai_drafted", "escalated", "approved"]);
  });

  it("rejects with a reason that goes back to the sender on WhatsApp", async () => {
    const t = waSetup();
    const east = await t.actor(USER.districtB);
    const done = await t.svc.wa.inbox.reject(east, IBX(2), { version: 1, reason: "Photo is blurry, please resend" });
    expect(done.state).toBe("done");
    expect(t.whatsapp.texts.some((m) => m.to === phone(8) && m.text.includes("Photo is blurry"))).toBe(true);
    expect(done.history.at(-1)).toMatchObject({ action: "rejected", note: "Photo is blurry, please resend" });
  });

  it("uses the template when the sender is outside the 24-hour window", async () => {
    const t = waSetup();
    t.advance(3 * 24 * 60 * 60 * 1000);
    const east = await t.actor(USER.districtB);
    await t.svc.wa.inbox.reject(east, IBX(2), { version: 1, reason: "Photo is blurry" });
    expect(t.whatsapp.sent.some((s) => s.template === "review_message" && s.to === phone(8) && s.params[0].includes("Photo is blurry"))).toBe(true);
  });

  it("asks the sender, and their reply joins the thread and fills the draft", async () => {
    const t = waSetup();
    const east = await t.actor(USER.districtB);
    const d = await t.svc.wa.inbox.get(east, IBX(1));
    const asked = await t.svc.wa.inbox.ask(east, IBX(1), { version: d.version, question: "How many volunteers came?" });
    expect(t.whatsapp.texts.some((m) => m.to === phone(1) && m.text.includes("How many volunteers came?"))).toBe(true);
    expect(asked.history.at(-1)?.action).toBe("asked");
    // coordinator A answers in chat
    const reply = await t.say(phone(1), "12 sevadal the");
    expect(reply[0].text).toBeTruthy();
    const after = await t.svc.wa.inbox.get(east, IBX(1));
    expect(after.history.at(-1)).toMatchObject({ action: "sender_replied", note: "12 sevadal the" });
    expect(after.thread.at(-1)?.text).toBe("12 sevadal the");
    expect(after.draft.answers).toMatchObject({ registered: 142 });
    // no longer waiting: the next message is a new item
    const before = (await t.repo.wa.inboxCounts({})).for_me;
    await t.say(phone(1), "Another camp, 30 log aaye");
    expect((await t.repo.wa.inboxCounts({})).for_me).toBe(before + 1);
  });

  it("answers 404 for media the viewer cannot see and audits views", async () => {
    const t = waSetup();
    const east = await t.actor(USER.districtB);
    const m = await t.svc.wa.inbox.openMedia(east, IBX(2), null);
    expect(m).toMatchObject({ path: "inbox/seed-register.png", mime: "image/png" });
    expect((await t.repo.portal.listAudit({ action: "inbox.view_media", limit: 5, offset: 0 })).total).toBe(1);
    const north = await t.actor(USER.districtG);
    expect(await code(t.svc.wa.inbox.openMedia(north, IBX(2), null))).toBe("NOT_FOUND");
    expect(await code(t.svc.wa.inbox.openMedia(east, IBX(1), null))).toBe("NOT_FOUND"); // text only
  });
});
