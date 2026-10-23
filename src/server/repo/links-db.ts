import "server-only";
import { and, desc, eq, gte, inArray, isNull, lt, or, sql } from "drizzle-orm";
import type { Db } from "../db/client";
import { newId } from "../db/columns";
import {
  approval,
  attachment,
  consentRecord,
  event,
  eventTimeline,
  formLink,
  formTemplate,
  formVersion,
  linkAllowedPhone,
  linkSession,
  type OtpPurpose,
  otpChallenge,
  submission,
  submissionAnswerKpi,
} from "../db/tables";
import { FormDefinition } from "@/contract";
import type {
  AllowedPhoneRec,
  AttachmentRec,
  FactInput,
  FormVersionRec,
  LinkRec,
  LinkSessionRec,
  LinksRepo,
  NewSubmissionResult,
  NewSubmissionWrite,
  OtpRec,
  SubmissionRec,
  SubmissionScope,
  SubmissionUpdateWrite,
} from "./links-types";

export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
type Exec = Db | Tx;

export const affected = (res: unknown): number => {
  const header = Array.isArray(res) ? res[0] : res;
  return typeof header === "object" && header !== null && "affectedRows" in header && typeof header.affectedRows === "number"
    ? header.affectedRows
    : 0;
};

export function isDuplicateKey(err: unknown): boolean {
  for (let e: unknown = err, i = 0; e && i < 4; i++) {
    if (typeof e === "object" && e !== null && "code" in e && e.code === "ER_DUP_ENTRY") return true;
    e = typeof e === "object" && e !== null && "cause" in e ? e.cause : null;
  }
  return false;
}

class UsedUp extends Error {}

export const linkCols = {
  id: formLink.id,
  tokenHash: formLink.tokenHash,
  tokenNonce: formLink.tokenNonce,
  eventId: formLink.eventId,
  purpose: formLink.purpose,
  label: formLink.label,
  formVersionId: formLink.formVersionId,
  sentToKind: formLink.sentToKind,
  sentToEnc: formLink.sentToEnc,
  sentToHash: formLink.sentToHash,
  sentToMasked: formLink.sentToMasked,
  expiresAt: formLink.expiresAt,
  maxUses: formLink.maxUses,
  uses: formLink.uses,
  revokedAt: formLink.revokedAt,
  otpRequired: formLink.otpRequired,
  createdBy: formLink.createdBy,
  lastOpenedAt: formLink.lastOpenedAt,
  version: formLink.version,
};

const otpCols = {
  id: otpChallenge.id,
  phoneHash: otpChallenge.phoneHash,
  purpose: otpChallenge.purpose,
  linkId: otpChallenge.linkId,
  codeHash: otpChallenge.codeHash,
  attempts: otpChallenge.attempts,
  lockedUntil: otpChallenge.lockedUntil,
  expiresAt: otpChallenge.expiresAt,
  sentAt: otpChallenge.sentAt,
  consumedAt: otpChallenge.consumedAt,
};

export const submissionCols = {
  id: submission.id,
  eventId: submission.eventId,
  linkId: submission.linkId,
  sessionId: submission.sessionId,
  formVersionId: submission.formVersionId,
  definitionVersion: submission.definitionVersion,
  answers: submission.answers,
  personalAnswers: submission.personalAnswers,
  submittedByHash: submission.submittedByHash,
  submittedByMasked: submission.submittedByMasked,
  source: submission.source,
  status: submission.status,
  idempotencyKey: submission.idempotencyKey,
  version: submission.version,
  submittedAt: submission.submittedAt,
  approvedAt: submission.approvedAt,
};

export const attachmentCols = {
  id: attachment.id,
  eventId: attachment.eventId,
  linkId: attachment.linkId,
  submissionId: attachment.submissionId,
  fieldId: attachment.fieldId,
  path: attachment.path,
  originalName: attachment.originalName,
  mime: attachment.mime,
  size: attachment.size,
  sha256: attachment.sha256,
  uploadedByHash: attachment.uploadedByHash,
  idempotencyKey: attachment.idempotencyKey,
  retentionUntil: attachment.retentionUntil,
  createdAt: attachment.createdAt,
};

const versionCols = {
  id: formVersion.id,
  templateId: formVersion.templateId,
  version: formVersion.version,
  status: formVersion.status,
  definition: formVersion.definition,
  publishedAt: formVersion.publishedAt,
};

/** Stored JSON is re-validated so a bad row can never reach the form app. */
const toVersion = (r: FormVersionRec): FormVersionRec => ({ ...r, definition: FormDefinition.parse(r.definition) });

export class DbLinksRepo implements LinksRepo {
  constructor(private readonly db: Db) {}

  async templates() {
    return this.db
      .select({
        id: formTemplate.id,
        code: formTemplate.code,
        sevaType: formTemplate.sevaType,
        purpose: formTemplate.purpose,
        titleEn: formTemplate.titleEn,
        titleHi: formTemplate.titleHi,
        active: formTemplate.active,
      })
      .from(formTemplate);
  }

  async versionById(id: string) {
    const [r] = await this.db.select(versionCols).from(formVersion).where(eq(formVersion.id, id)).limit(1);
    return r ? toVersion(r) : null;
  }

  async publishedVersion(templateId: string) {
    const [r] = await this.db
      .select(versionCols)
      .from(formVersion)
      .where(and(eq(formVersion.templateId, templateId), eq(formVersion.status, "published")))
      .orderBy(desc(formVersion.version))
      .limit(1);
    return r ? toVersion(r) : null;
  }

  async eventFormVersionId(eventId: string) {
    const [r] = await this.db.select({ v: event.formVersionId }).from(event).where(eq(event.id, eventId)).limit(1);
    return r?.v ?? null;
  }

  async lockEventFormVersion(eventId: string, versionId: string) {
    await this.db.update(event).set({ formVersionId: versionId }).where(and(eq(event.id, eventId), isNull(event.formVersionId)));
    return (await this.eventFormVersionId(eventId)) ?? versionId;
  }

  async linkByTokenHash(hash: string) {
    const [r] = await this.db.select(linkCols).from(formLink).where(eq(formLink.tokenHash, hash)).limit(1);
    return r ?? null;
  }

  async linkById(id: string) {
    const [r] = await this.db.select(linkCols).from(formLink).where(eq(formLink.id, id)).limit(1);
    return r ?? null;
  }

  async linksForEvent(eventId: string) {
    return this.db.select(linkCols).from(formLink).where(eq(formLink.eventId, eventId)).orderBy(formLink.createdAt, formLink.id);
  }

  async insertLink(rec: LinkRec) {
    await this.db.insert(formLink).values(rec);
  }

  async updateLink(id: string, patch: Partial<Pick<LinkRec, "expiresAt" | "revokedAt" | "lastOpenedAt">>) {
    await this.db
      .update(formLink)
      .set({ ...patch, version: sql`${formLink.version} + 1` })
      .where(eq(formLink.id, id));
  }

  async allowedPhone(eventId: string, phoneHash: string) {
    const [r] = await this.db
      .select({
        id: linkAllowedPhone.id,
        eventId: linkAllowedPhone.eventId,
        phoneHash: linkAllowedPhone.phoneHash,
        phoneEnc: linkAllowedPhone.phoneEnc,
        phoneMasked: linkAllowedPhone.phoneMasked,
        label: linkAllowedPhone.label,
      })
      .from(linkAllowedPhone)
      .where(and(eq(linkAllowedPhone.eventId, eventId), eq(linkAllowedPhone.phoneHash, phoneHash)))
      .limit(1);
    return r ?? null;
  }

  async addAllowedPhone(rec: AllowedPhoneRec) {
    await this.db.insert(linkAllowedPhone).values(rec).onDuplicateKeyUpdate({ set: { label: rec.label } });
  }

  async latestOtp(phoneHash: string, purpose: OtpPurpose, linkId: string | null) {
    const [r] = await this.db
      .select(otpCols)
      .from(otpChallenge)
      .where(
        and(
          eq(otpChallenge.phoneHash, phoneHash),
          eq(otpChallenge.purpose, purpose),
          linkId === null ? isNull(otpChallenge.linkId) : eq(otpChallenge.linkId, linkId),
        ),
      )
      .orderBy(desc(otpChallenge.sentAt))
      .limit(1);
    return r ?? null;
  }

  async countOtpsSince(phoneHash: string, since: Date) {
    const [r] = await this.db
      .select({ n: sql<number>`count(*)` })
      .from(otpChallenge)
      .where(and(eq(otpChallenge.phoneHash, phoneHash), gte(otpChallenge.sentAt, since)));
    return Number(r?.n ?? 0);
  }

  async insertOtp(rec: OtpRec) {
    await this.db.insert(otpChallenge).values(rec);
  }

  async updateOtp(id: string, patch: Partial<Pick<OtpRec, "attempts" | "lockedUntil" | "consumedAt" | "expiresAt" | "sentAt">>) {
    await this.db.update(otpChallenge).set(patch).where(eq(otpChallenge.id, id));
  }

  async insertSession(rec: LinkSessionRec) {
    await this.db.insert(linkSession).values(rec);
    // Opportunistic cleanup keeps the table small without a cron job.
    await this.db.delete(linkSession).where(lt(linkSession.expiresAt, new Date(Date.now() - 24 * 60 * 60 * 1000)));
  }

  async sessionById(id: string) {
    const [r] = await this.db
      .select({
        id: linkSession.id,
        linkId: linkSession.linkId,
        phoneHash: linkSession.phoneHash,
        phoneMasked: linkSession.phoneMasked,
        expiresAt: linkSession.expiresAt,
      })
      .from(linkSession)
      .where(eq(linkSession.id, id))
      .limit(1);
    return r ?? null;
  }

  async submissionById(id: string) {
    const [r] = await this.db.select(submissionCols).from(submission).where(eq(submission.id, id)).limit(1);
    return r ?? null;
  }

  async submissionByIdempotencyKey(key: string) {
    const [r] = await this.db.select(submissionCols).from(submission).where(eq(submission.idempotencyKey, key)).limit(1);
    return r ?? null;
  }

  async latestSubmission(scope: SubmissionScope): Promise<SubmissionRec | null> {
    const conds = [eq(submission.eventId, scope.eventId)];
    if (scope.linkId) conds.push(eq(submission.linkId, scope.linkId));
    if (scope.sessionId) conds.push(eq(submission.sessionId, scope.sessionId));
    if (scope.purpose) conds.push(eq(formLink.purpose, scope.purpose));
    const [r] = await this.db
      .select(submissionCols)
      .from(submission)
      .leftJoin(formLink, eq(formLink.id, submission.linkId))
      .where(and(...conds))
      .orderBy(desc(submission.submittedAt))
      .limit(1);
    return r ?? null;
  }

  async createSubmission(w: NewSubmissionWrite): Promise<NewSubmissionResult> {
    try {
      await this.db.transaction(async (tx) => {
        if (w.linkId) {
          const used = await tx
            .update(formLink)
            .set({ uses: sql`${formLink.uses} + 1` })
            .where(and(eq(formLink.id, w.linkId), or(isNull(formLink.maxUses), lt(formLink.uses, formLink.maxUses))));
          if (affected(used) === 0) throw new UsedUp();
        }
        await tx.insert(submission).values(w.submission);
        await this.writeFacts(tx, w.submission.eventId, w.submission.id, w.facts);
        if (w.consents.length) await tx.insert(consentRecord).values(w.consents);
        await this.claimAttachments(tx, w.attachmentIds, w.submission.id);
        await this.moveEvent(tx, w.submission.eventId, w.eventStatus);
        if (w.volunteersJoinedDelta) {
          await tx
            .update(event)
            .set({ volunteersJoined: sql`${event.volunteersJoined} + ${w.volunteersJoinedDelta}` })
            .where(eq(event.id, w.submission.eventId));
        }
      });
      return "ok";
    } catch (err) {
      if (err instanceof UsedUp) return "used_up";
      if (isDuplicateKey(err)) return "duplicate_key";
      throw err;
    }
  }

  async updateSubmission(w: SubmissionUpdateWrite): Promise<"ok" | "conflict"> {
    let result: "ok" | "conflict" = "ok";
    await this.db.transaction(async (tx) => {
      const res = await tx
        .update(submission)
        .set({ answers: w.answers, personalAnswers: w.personalAnswers, status: w.status, version: sql`${submission.version} + 1` })
        .where(and(eq(submission.id, w.id), eq(submission.version, w.expectedVersion)));
      if (affected(res) === 0) {
        result = "conflict";
        return;
      }
      if (w.facts) {
        await tx.delete(submissionAnswerKpi).where(eq(submissionAnswerKpi.submissionId, w.id));
        await this.writeFacts(tx, w.eventId, w.id, w.facts);
      }
      await tx.delete(consentRecord).where(eq(consentRecord.submissionId, w.id));
      if (w.consents.length) await tx.insert(consentRecord).values(w.consents);
      await this.claimAttachments(tx, w.attachmentIds, w.id);
      await this.moveEvent(tx, w.eventId, w.eventStatus ?? null);
    });
    return result;
  }

  async insertAttachment(rec: AttachmentRec) {
    await this.db.insert(attachment).values(rec);
  }

  async attachmentsByIds(ids: readonly string[]) {
    if (ids.length === 0) return [];
    return this.db.select(attachmentCols).from(attachment).where(inArray(attachment.id, [...ids]));
  }

  async attachmentByIdempotencyKey(linkId: string, key: string) {
    const [r] = await this.db
      .select(attachmentCols)
      .from(attachment)
      .where(and(eq(attachment.linkId, linkId), eq(attachment.idempotencyKey, key)))
      .limit(1);
    return r ?? null;
  }

  /** Moves the event when its status is one of `from`, adding the timeline step and opening the approval. */
  private async moveEvent(tx: Exec, eventId: string, m: NewSubmissionWrite["eventStatus"]) {
    if (!m) return;
    const moved = await tx
      .update(event)
      .set({ status: m.to, version: sql`${event.version} + 1` })
      .where(and(eq(event.id, eventId), inArray(event.status, [...m.from])));
    if (affected(moved) === 0) return;
    await tx.insert(eventTimeline).values({ id: newId(), eventId, ...m.timeline });
    if (m.approval) await tx.insert(approval).values(m.approval);
  }

  private async writeFacts(tx: Exec, eventId: string, submissionId: string, facts: readonly FactInput[]) {
    if (facts.length === 0) return;
    await tx
      .insert(submissionAnswerKpi)
      .values(facts.map((f) => ({ id: newId(), eventId, submissionId, kpiKey: f.kpiKey, dim: f.dim, value: f.value, estimate: false, approvedAt: null })));
  }

  private async claimAttachments(tx: Exec, ids: readonly string[], submissionId: string) {
    if (ids.length === 0) return;
    await tx.update(attachment).set({ submissionId }).where(inArray(attachment.id, [...ids]));
  }
}
