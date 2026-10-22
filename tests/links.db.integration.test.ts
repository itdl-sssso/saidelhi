// Form-link flow against the docker MySQL (pnpm db:migrate && pnpm db:seed); skipped when unreachable.
import { and, eq, gte, inArray } from "drizzle-orm";
import type { Pool } from "mysql2/promise";
import { afterAll, describe, expect, it } from "vitest";
import { FormPayload, LinkInfo, Submission } from "@/contract";
import { createDb, createPool, type Db } from "@/server/db/client";
import { event, eventTimeline, formLink, linkAllowedPhone, submission, submissionAnswerKpi } from "@/server/db/tables";
import { EVENT } from "@/server/mock/fixtures";
import { DbRepo } from "@/server/repo/db";
import { createServices } from "@/server/services/create";
import { FakeWhatsApp, MemoryStorage } from "./support/links";
import { EYE_ANSWERS } from "./support/forms";

const url = process.env.DATABASE_URL ?? "mysql://app:app@127.0.0.1:3307/saidelhi";

async function probe(): Promise<Pool | null> {
  const pool = createPool(url);
  try {
    const [rows] = await pool.query("SELECT COUNT(*) AS n FROM form_link");
    if (Array.isArray(rows) && Number((rows[0] as { n: number }).n) > 0) return pool;
  } catch {
    // unreachable or M2 migration not applied
  }
  await pool.end().catch(() => {});
  return null;
}

const pool = await probe();

describe.skipIf(!pool)("form links on MySQL (integration)", () => {
  const started = new Date(Date.now() - 1000);
  const db: Db | null = pool ? createDb(pool) : null;
  const whatsapp = new FakeWhatsApp();
  const svc = db ? createServices(new DbRepo(db), { now: () => new Date(), mediaBase: "/media", whatsapp, storage: new MemoryStorage() }) : null;
  const phone = `+9190000${String(Math.floor(Math.random() * 90000) + 10000)}`;
  const created: string[] = [];
  let original: { status: typeof event.$inferSelect.status; version: number } | undefined;

  afterAll(async () => {
    if (!db) return;
    if (created.length) {
      const subs = await db.select({ id: submission.id }).from(submission).where(inArray(submission.linkId, created));
      if (subs.length) await db.delete(submissionAnswerKpi).where(inArray(submissionAnswerKpi.submissionId, subs.map((s) => s.id)));
      await db.delete(submission).where(inArray(submission.linkId, created));
      await db.delete(formLink).where(inArray(formLink.id, created));
    }
    await db.delete(eventTimeline).where(and(eq(eventTimeline.eventId, EVENT.eyePlanned), gte(eventTimeline.createdAt, started)));
    await db.delete(linkAllowedPhone).where(and(eq(linkAllowedPhone.eventId, EVENT.eyePlanned), eq(linkAllowedPhone.label, "integration")));
    if (original) await db.update(event).set(original).where(eq(event.id, EVENT.eyePlanned));
    await pool?.end();
  });

  it("issues a report link, verifies by OTP, submits idempotently and edits", async () => {
    if (!svc || !db) return;
    const [ev] = await db.select({ status: event.status, version: event.version }).from(event).where(eq(event.id, EVENT.eyePlanned));
    original = ev;

    const { link, token } = await svc.links.createLink(EVENT.eyePlanned, "report", { sendTo: phone, recipientLabel: "integration", label: "Report (integration)" });
    created.push(link.id);
    expect(LinkInfo.parse(await svc.links.info(token, null))).toMatchObject({ state: "active", purpose: "report", otpRequired: true });

    await svc.links.sendOtp(token, phone, "en");
    const grant = await svc.links.verify(token, phone, whatsapp.lastCode(), "en");
    const form = FormPayload.parse(await svc.links.form(token, grant.sessionToken, "en"));
    expect(form.prefill.venue).toBe("Sai Centre Gurugram");

    const key = `it-${Date.now()}`;
    const first = await svc.links.submit(token, grant.sessionToken, key, EYE_ANSWERS, "en");
    const again = await svc.links.submit(token, grant.sessionToken, key, EYE_ANSWERS, "en");
    expect(again.replayed).toBe(true);
    expect(again.submission.id).toBe(first.submission.id);
    Submission.parse(first.submission);

    const [row] = await db.select({ uses: formLink.uses }).from(formLink).where(eq(formLink.id, link.id));
    expect(row.uses).toBe(1);
    const facts = await db.select().from(submissionAnswerKpi).where(eq(submissionAnswerKpi.submissionId, first.submission.id));
    expect(facts.length).toBeGreaterThan(5);
    expect(facts.every((f) => f.approvedAt === null)).toBe(true);
    const [after] = await db.select({ status: event.status }).from(event).where(eq(event.id, EVENT.eyePlanned));
    expect(after.status).toBe("report_submitted");

    const edited = await svc.links.update(token, grant.sessionToken, first.submission.id, { answers: { ...EYE_ANSWERS, cataract_surgeries: 4 }, version: 1 }, "en");
    expect(edited.version).toBe(2);
    await expect(svc.links.update(token, grant.sessionToken, first.submission.id, { answers: EYE_ANSWERS, version: 1 }, "en")).rejects.toMatchObject({ code: "CONFLICT" });
  });
});
