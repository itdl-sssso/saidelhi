import "server-only";
import { and, asc, count, eq, inArray, isNotNull, lt, or } from "drizzle-orm";
import type { Db } from "../db/client";
import { newId } from "../db/columns";
import { attachment, auditLog, consentRecord, formVersion, inboxItem, otpChallenge, privacyRequest, submission, whatsappMessage, whatsappOptin } from "../db/tables";
import type { Tx } from "./links-db";
import type { ConsentRow, MediaRef, PersonalSubmission, PrivacyRepo, PrivacyRequestFull, PrivacyRequestPatchRec } from "./privacy-types";
import type { AuditRec } from "./types";

const toFull = (r: typeof privacyRequest.$inferSelect): PrivacyRequestFull => ({
  id: r.id,
  name: r.name,
  phone: r.phone,
  type: r.type,
  details: r.details,
  locale: r.locale,
  dueAt: r.dueAt,
  ipHash: r.ipHash,
  status: r.status,
  assigneeId: r.assigneeId,
  handledBy: r.handledBy,
  closedAt: r.closedAt,
  steps: r.steps ?? [],
  version: r.version,
  createdAt: r.createdAt,
});

export class DbPrivacyRepo implements PrivacyRepo {
  constructor(private readonly db: Db) {}

  private async audit(tx: Tx | Db, recs?: readonly AuditRec[]) {
    if (recs?.length) await tx.insert(auditLog).values(recs.map((r) => ({ ...r, id: newId() })));
  }

  async requests() {
    return (await this.db.select().from(privacyRequest).orderBy(asc(privacyRequest.createdAt), asc(privacyRequest.id))).map(toFull);
  }

  async requestById(id: string) {
    const [r] = await this.db.select().from(privacyRequest).where(eq(privacyRequest.id, id)).limit(1);
    return r ? toFull(r) : null;
  }

  async updateRequest(id: string, patch: PrivacyRequestPatchRec, expectVersion: number, audit?: AuditRec[]) {
    return this.db.transaction(async (tx) => {
      const [res] = await tx
        .update(privacyRequest)
        .set({ ...patch, version: expectVersion + 1 })
        .where(and(eq(privacyRequest.id, id), eq(privacyRequest.version, expectVersion)));
      if (!res.affectedRows) return "conflict" as const;
      await this.audit(tx, audit);
      return "ok" as const;
    });
  }

  async deleteRequests(ids: readonly string[], audit?: AuditRec[]) {
    if (!ids.length) return 0;
    return this.db.transaction(async (tx) => {
      const [res] = await tx.delete(privacyRequest).where(inArray(privacyRequest.id, [...ids]));
      await this.audit(tx, audit);
      return res.affectedRows;
    });
  }

  async personalSubmissions(): Promise<PersonalSubmission[]> {
    const rows = await this.db
      .select({ id: submission.id, eventId: submission.eventId, linkId: submission.linkId, submittedAt: submission.submittedAt, personalAnswers: submission.personalAnswers })
      .from(submission)
      .where(isNotNull(submission.personalAnswers));
    return rows.flatMap((r) => (r.personalAnswers ? [{ ...r, personalAnswers: r.personalAnswers }] : []));
  }

  async clearPersonal(ids: readonly string[], audit?: AuditRec[]) {
    if (!ids.length) return 0;
    return this.db.transaction(async (tx) => {
      const [res] = await tx.update(submission).set({ personalAnswers: null }).where(inArray(submission.id, [...ids]));
      await this.audit(tx, audit);
      return res.affectedRows;
    });
  }

  async writePersonal(id: string, value: Record<string, unknown> | null, audit?: AuditRec[]) {
    await this.db.transaction(async (tx) => {
      await tx.update(submission).set({ personalAnswers: value }).where(eq(submission.id, id));
      await this.audit(tx, audit);
    });
  }

  async deleteOptIn(id: string) {
    const [res] = await this.db.delete(whatsappOptin).where(eq(whatsappOptin.id, id));
    return res.affectedRows > 0;
  }

  async consentRows(): Promise<ConsentRow[]> {
    return this.db
      .select({ templateId: formVersion.templateId, purpose: consentRecord.purpose, givenAt: consentRecord.givenAt, withdrawnAt: consentRecord.withdrawnAt })
      .from(consentRecord)
      .innerJoin(submission, eq(submission.id, consentRecord.submissionId))
      .innerJoin(formVersion, eq(formVersion.id, submission.formVersionId));
  }

  async optinCounts() {
    const rows = await this.db.select({ status: whatsappOptin.status, n: count() }).from(whatsappOptin).groupBy(whatsappOptin.status);
    const n = (st: string) => rows.find((r) => r.status === st)?.n ?? 0;
    return { optedIn: n("opted_in"), pending: n("pending"), stopped: n("stopped") };
  }

  private dueMessages = (before: Date) =>
    and(lt(whatsappMessage.createdAt, before), or(isNotNull(whatsappMessage.text), isNotNull(whatsappMessage.payload), isNotNull(whatsappMessage.mediaPath)));

  async messagesDue(before: Date) {
    const [r] = await this.db.select({ n: count() }).from(whatsappMessage).where(this.dueMessages(before));
    return r?.n ?? 0;
  }

  async scrubMessages(before: Date) {
    const rows = await this.db.select({ id: whatsappMessage.id, path: whatsappMessage.mediaPath }).from(whatsappMessage).where(this.dueMessages(before));
    if (!rows.length) return { count: 0, media: [] };
    for (let i = 0; i < rows.length; i += 500) {
      await this.db
        .update(whatsappMessage)
        .set({ text: null, payload: null, mediaPath: null, mediaName: null, mediaMime: null })
        .where(inArray(whatsappMessage.id, rows.slice(i, i + 500).map((r) => r.id)));
    }
    return { count: rows.length, media: rows.flatMap((r) => (r.path ? [r.path] : [])) };
  }

  async inboxMediaDue(before: Date): Promise<MediaRef[]> {
    const rows = await this.db
      .select({ id: inboxItem.id, path: inboxItem.mediaPath })
      .from(inboxItem)
      .where(and(eq(inboxItem.state, "done"), lt(inboxItem.receivedAt, before), isNotNull(inboxItem.mediaPath)));
    return rows.flatMap((r) => (r.path ? [{ id: r.id, path: r.path }] : []));
  }

  async clearInboxMedia(ids: readonly string[]) {
    if (ids.length) await this.db.update(inboxItem).set({ mediaPath: null, mediaName: null }).where(inArray(inboxItem.id, [...ids]));
  }

  async attachmentsDue(now: Date): Promise<MediaRef[]> {
    return this.db.select({ id: attachment.id, path: attachment.path }).from(attachment).where(lt(attachment.retentionUntil, now));
  }

  async deleteAttachments(ids: readonly string[]) {
    if (ids.length) await this.db.delete(attachment).where(inArray(attachment.id, [...ids]));
  }

  private otpCond = (before: Date) => or(lt(otpChallenge.expiresAt, before), isNotNull(otpChallenge.consumedAt));

  async otpDue(before: Date) {
    const [r] = await this.db.select({ n: count() }).from(otpChallenge).where(and(this.otpCond(before), lt(otpChallenge.sentAt, before)));
    return r?.n ?? 0;
  }

  async deleteOtp(before: Date) {
    const [res] = await this.db.delete(otpChallenge).where(and(this.otpCond(before), lt(otpChallenge.sentAt, before)));
    return res.affectedRows;
  }
}
