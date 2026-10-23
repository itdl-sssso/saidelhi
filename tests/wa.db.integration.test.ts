// WhatsApp repo, bot, inbox and admin on the docker MySQL (pnpm db:migrate && pnpm db:seed);
// skipped when unreachable. Restores what it touches.
import { and, eq, gte, inArray } from "drizzle-orm";
import type { Pool } from "mysql2/promise";
import { afterAll, describe, expect, it } from "vitest";
import { createDb, createPool } from "@/server/db/client";
import { auditLog, inboxItem, whatsappConversation, whatsappMessage, whatsappOptin, reminderRule } from "@/server/db/tables";
import { DISTRICT, EVENT, USER, devUserPhone } from "@/server/mock/fixtures";
import { DbRepo } from "@/server/repo/db";
import { issueBotChallenge } from "@/server/security/link-token";
import { DEV_SESSION_SECRET } from "@/server/security/crypto";
import { phoneHash } from "@/server/security/phone";
import { createServices } from "@/server/services/create";
import { FakeWhatsApp, MemoryStorage } from "./support/links";

const url = process.env.DATABASE_URL ?? "mysql://app:app@127.0.0.1:3307/saidelhi";

async function probe(): Promise<Pool | null> {
  const pool = createPool(url);
  try {
    const [rows] = await pool.query("SELECT COUNT(*) AS n FROM inbox_item");
    if (Array.isArray(rows) && Number((rows[0] as { n: number }).n) > 0) return pool;
  } catch {
    // unreachable, or the M4 migration/seed is not applied
  }
  await pool.end().catch(() => {});
  return null;
}

const pool = await probe();

describe.skipIf(!pool)("WhatsApp on MySQL (integration)", () => {
  const started = new Date(Date.now() - 1000);
  const db = pool ? createDb(pool) : null;
  const whatsapp = new FakeWhatsApp();
  const svc = db ? createServices(new DbRepo(db), { now: () => new Date(), mediaBase: "/media", whatsapp, storage: new MemoryStorage() }) : null;
  const rc = { requestId: "it-wa", ipHash: null };
  const TEST_PHONE = "+919810000099";
  const hashA = phoneHash(DEV_SESSION_SECRET, devUserPhone(1));
  let convBackup: typeof whatsappConversation.$inferSelect | undefined;
  const optinPhone = "+919810000098";

  afterAll(async () => {
    if (db) {
      const created = await db.select({ id: inboxItem.id }).from(inboxItem).where(gte(inboxItem.createdAt, started));
      if (created.length) {
        const ids = created.map((c) => c.id);
        await db.delete(whatsappMessage).where(inArray(whatsappMessage.inboxItemId, ids));
        await db.delete(inboxItem).where(inArray(inboxItem.id, ids));
      }
      await db.delete(whatsappMessage).where(and(eq(whatsappMessage.phoneHash, hashA), gte(whatsappMessage.createdAt, started)));
      await db.delete(whatsappMessage).where(eq(whatsappMessage.phoneHash, phoneHash(DEV_SESSION_SECRET, TEST_PHONE)));
      await db.delete(whatsappConversation).where(eq(whatsappConversation.phoneHash, phoneHash(DEV_SESSION_SECRET, TEST_PHONE)));
      await db.delete(whatsappOptin).where(eq(whatsappOptin.phoneHash, phoneHash(DEV_SESSION_SECRET, optinPhone)));
      if (convBackup) await db.update(whatsappConversation).set(convBackup).where(eq(whatsappConversation.id, convBackup.id));
      await db.update(reminderRule).set({ enabled: true });
      await db.delete(auditLog).where(and(gte(auditLog.at, started), eq(auditLog.requestId, "it-wa")));
    }
    await pool?.end();
  });

  it("remembers the language and runs a public flow from the database", async () => {
    const s = svc!;
    const first = await s.wa.handle({ from: TEST_PHONE, text: "hello", replyId: null, media: null });
    expect(first[0].buttons?.map((b) => b.id)).toEqual(["lang:en", "lang:hi"]);
    await s.wa.handle({ from: TEST_PHONE, text: null, replyId: "lang:en", media: null });
    const [conv] = await db!.select().from(whatsappConversation).where(eq(whatsappConversation.phoneHash, phoneHash(DEV_SESSION_SECRET, TEST_PHONE)));
    expect(conv.locale).toBe("en");
    expect(conv.messageCount).toBeGreaterThanOrEqual(2);
    await s.wa.handle({ from: TEST_PHONE, text: null, replyId: "m:near", media: null });
    const near = await s.wa.handle({ from: TEST_PHONE, text: "East", replyId: null, media: null });
    expect(near[0].text).toContain("Coming up in East");
    const again = await s.wa.handle({ from: TEST_PHONE, text: "menu", replyId: null, media: null });
    expect(again[0].buttons?.map((b) => b.id)).not.toContain("lang:en");
    const thread = await s.wa.dev.messages(TEST_PHONE);
    expect(thread.filter((m) => m.dir === "in").length).toBe(5);
  });

  it("scopes the inbox, ingests chat text with a draft, and rejects with a message to the sender", async () => {
    const s = svc!;
    const [backup] = await db!.select().from(whatsappConversation).where(eq(whatsappConversation.phoneHash, hashA));
    convBackup = backup;
    const east = (await s.auth.actorFor(USER.districtB, rc))!;
    const north = (await s.auth.actorFor(USER.districtG, rc))!;
    const before = await s.wa.inbox.list(east, { tab: "for_me", page: 1, pageSize: 20 });
    expect(before.meta.counts.for_me).toBeGreaterThanOrEqual(3);
    expect((await s.wa.inbox.list(north, { tab: "for_me", page: 1, pageSize: 20 })).data).toEqual([]);

    await s.wa.handle({ from: devUserPhone(1), text: "Eye camp aaj, 50 log aaye, 30 chashme diye", replyId: null, media: null });
    const after = await s.wa.inbox.list(east, { tab: "for_me", page: 1, pageSize: 50 });
    expect(after.meta.total).toBe(before.meta.total + 1);
    const row = after.data.find((r) => !before.data.some((b) => b.id === r.id))!;
    expect(row.matchedEvent?.id).toBe(EVENT.eyeMayurCamp);
    const detail = await s.wa.inbox.get(east, row.id);
    expect(detail.draft.answers).toMatchObject({ registered: 50, spectacles_total: 30 });
    expect(detail.thread.map((m) => m.dir)).toContain("in");
    expect(detail.history[0].action).toBe("ai_drafted");

    const edited = await s.wa.inbox.patch(east, row.id, { version: detail.version, answers: { registered: 55 } });
    expect(edited.version).toBe(detail.version + 1);
    await expect(s.wa.inbox.reject(east, row.id, { version: detail.version, reason: "stale screen" })).rejects.toMatchObject({ code: "CONFLICT" });
    const done = await s.wa.inbox.reject(east, row.id, { version: edited.version, reason: "Please send the register photo" });
    expect(done.state).toBe("done");
    expect(done.history.map((h) => h.action)).toEqual(["ai_drafted", "edited", "rejected"]);
    expect(whatsapp.texts.some((m) => m.to === devUserPhone(1) && m.text.includes("register photo"))).toBe(true);
  });

  it("serves admin tabs, estimates a broadcast and toggles a rule", async () => {
    const s = svc!;
    const state = (await s.auth.actorFor(USER.stateC, rc))!;
    expect((await s.wa.admin.templates(state)).length).toBeGreaterThanOrEqual(10);
    const rules = await s.wa.admin.reminders(state);
    expect(rules).toHaveLength(5);
    const off = await s.wa.admin.patchReminder(state, rules[0].id, { enabled: false });
    expect(off.enabled).toBe(false);
    expect((await s.wa.admin.reminders(state))[0].enabled).toBe(false);
    const est = await s.wa.admin.broadcast(state, { districtIds: [DISTRICT.east], sevaTypes: [], text: { en: "x", hi: null }, dryRun: true });
    expect(est).toMatchObject({ sent: false, recipients: 5, estimatedCostInr: 3.9 });
    const log = await s.wa.admin.log(state, { page: 1, pageSize: 5 });
    expect(log.data.length).toBeGreaterThan(0);
    expect(log.data.every((c) => c.phone.includes("•"))).toBe(true);
    expect((await s.wa.admin.status(state)).optedIn).toBe(10);
  });

  it("stores an opt-in request, records consent on YES and honours STOP", async () => {
    const s = svc!;
    const token = issueBotChallenge(DEV_SESSION_SECRET, "optin", new Date(Date.now() - 5000));
    await s.wa.optin.request({ phone: optinPhone, districtId: DISTRICT.east, sevaTypes: ["eye"], locale: "en", botToken: token }, { requestId: "it-wa", ipHash: null });
    const rec = () => db!.select().from(whatsappOptin).where(eq(whatsappOptin.phoneHash, phoneHash(DEV_SESSION_SECRET, optinPhone)));
    expect((await rec())[0]).toMatchObject({ status: "pending", consentAt: null, via: "web" });
    await s.wa.handle({ from: optinPhone, text: "YES", replyId: null, media: null });
    expect((await rec())[0].status).toBe("opted_in");
    expect((await rec())[0].consentAt).not.toBeNull();
    await s.wa.handle({ from: optinPhone, text: "STOP", replyId: null, media: null });
    expect((await rec())[0].status).toBe("stopped");
    await db!.delete(whatsappMessage).where(eq(whatsappMessage.phoneHash, phoneHash(DEV_SESSION_SECRET, optinPhone)));
    await db!.delete(whatsappConversation).where(eq(whatsappConversation.phoneHash, phoneHash(DEV_SESSION_SECRET, optinPhone)));
  });
});
