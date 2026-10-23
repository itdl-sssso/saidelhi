// Storage port for form templates, links, OTP, link sessions, submissions and
// private attachments. Implemented in memory (links-mock.ts) and on MySQL (links-db.ts).
import type { EventStatus, FormDefinition, LinkPurpose, Role, SevaType, Source, SubmissionStatus, TimelineChannel } from "@/contract";
import type { FormVersionStatus, OtpPurpose } from "../db/schema/forms";
import type { ApprovalRec } from "./portal-types";

export interface TemplateRec {
  id: string;
  code: string;
  sevaType: SevaType | null;
  purpose: LinkPurpose;
  titleEn: string;
  titleHi: string | null;
  active: boolean;
}

export interface FormVersionRec {
  id: string;
  templateId: string;
  version: number;
  status: FormVersionStatus;
  definition: FormDefinition;
  publishedAt: Date | null;
  publishedBy?: string | null;
  /** Draft revision (builder concurrency); 1 for seeded rows. */
  rev?: number;
  updatedAt?: Date;
}

export interface LinkRec {
  id: string;
  tokenHash: string;
  tokenNonce: string;
  eventId: string;
  purpose: LinkPurpose;
  label: string;
  formVersionId: string;
  sentToKind: "phone" | "qr" | null;
  sentToEnc: string | null;
  sentToHash: string | null;
  sentToMasked: string | null;
  expiresAt: Date;
  maxUses: number | null;
  uses: number;
  revokedAt: Date | null;
  otpRequired: boolean;
  createdBy: string | null;
  lastOpenedAt: Date | null;
  version: number;
}

export interface AllowedPhoneRec {
  id: string;
  eventId: string;
  phoneHash: string;
  phoneEnc: string;
  phoneMasked: string;
  label: string | null;
}

export interface OtpRec {
  id: string;
  phoneHash: string;
  purpose: OtpPurpose;
  linkId: string | null;
  codeHash: string;
  attempts: number;
  lockedUntil: Date | null;
  expiresAt: Date;
  sentAt: Date;
  consumedAt: Date | null;
}

export interface LinkSessionRec {
  id: string;
  linkId: string;
  phoneHash: string | null;
  phoneMasked: string | null;
  expiresAt: Date;
}

export interface SubmissionRec {
  id: string;
  eventId: string;
  linkId: string | null;
  sessionId: string | null;
  formVersionId: string;
  definitionVersion: number;
  answers: Record<string, unknown>;
  personalAnswers: Record<string, unknown> | null;
  submittedByHash: string | null;
  submittedByMasked: string;
  source: Source;
  status: SubmissionStatus;
  idempotencyKey: string | null;
  version: number;
  submittedAt: Date;
  approvedAt: Date | null;
}

export interface AttachmentRec {
  id: string;
  eventId: string;
  linkId: string | null;
  submissionId: string | null;
  fieldId: string | null;
  path: string;
  originalName: string;
  mime: string;
  size: number;
  sha256: string;
  uploadedByHash: string | null;
  idempotencyKey: string | null;
  retentionUntil: Date;
  createdAt: Date;
}

export interface ConsentRec {
  id: string;
  submissionId: string;
  eventId: string;
  subjectRef: string;
  purpose: string;
  statement: string;
  recordedByHash: string | null;
  givenAt: Date;
}

export interface FactInput {
  kpiKey: string;
  dim: string;
  value: number;
}

export interface TimelineInput {
  status: EventStatus;
  at: Date;
  byRole: Role | null;
  byLabel: string | null;
  channel: TimelineChannel | null;
}

/** Everything a new submission changes, applied atomically. */
export interface NewSubmissionWrite {
  submission: SubmissionRec;
  /** Pending KPI facts (approved_at null until the district approves). */
  facts: FactInput[];
  consents: ConsentRec[];
  attachmentIds: string[];
  /** Link whose `uses` is incremented; fails with "used_up" once max_uses is reached. Null for chat/inbox submissions without a link. */
  linkId: string | null;
  /** Moves the event only when its current status is one of `from` (and then opens `approval`). */
  eventStatus: { from: readonly EventStatus[]; to: EventStatus; timeline: TimelineInput; approval?: ApprovalRec } | null;
  volunteersJoinedDelta: number;
}

export interface SubmissionUpdateWrite {
  id: string;
  expectedVersion: number;
  answers: Record<string, unknown>;
  personalAnswers: Record<string, unknown> | null;
  status: SubmissionStatus;
  facts: FactInput[] | null;
  consents: ConsentRec[];
  attachmentIds: string[];
  eventId: string;
  /** A corrected report after "request changes" moves the event back to report_submitted. */
  eventStatus?: NewSubmissionWrite["eventStatus"];
}

export type NewSubmissionResult = "ok" | "used_up" | "duplicate_key";

export interface SubmissionScope {
  eventId: string;
  /** Report scope: any link of this purpose for the event. */
  purpose?: LinkPurpose;
  linkId?: string;
  sessionId?: string;
}

export interface LinksRepo {
  templates(): Promise<TemplateRec[]>;
  versionById(id: string): Promise<FormVersionRec | null>;
  /** Highest published version of a template. */
  publishedVersion(templateId: string): Promise<FormVersionRec | null>;
  /** Every version of a template (drafts included), oldest first. */
  versionsOf(templateId: string): Promise<FormVersionRec[]>;
  /** Active (not revoked, not expired) links per form version id. */
  activeLinkCounts(now: Date): Promise<Map<string, number>>;
  insertTemplate(t: TemplateRec, first: FormVersionRec, createdBy: string | null): Promise<"ok" | "duplicate">;
  updateTemplate(id: string, patch: Partial<Pick<TemplateRec, "titleEn" | "titleHi" | "active">>): Promise<void>;
  insertVersion(v: FormVersionRec, createdBy: string | null): Promise<"ok" | "duplicate">;
  /** Draft rows only; `conflict` when the revision differs or the row is no longer a draft. */
  updateDraft(id: string, definition: FormDefinition, expectRev: number): Promise<"ok" | "conflict">;
  publishDraft(id: string, expectRev: number, at: Date, by: string | null): Promise<"ok" | "conflict">;
  eventFormVersionId(eventId: string): Promise<string | null>;
  /** Sets event.form_version_id if still null; returns the locked id. */
  lockEventFormVersion(eventId: string, versionId: string): Promise<string>;

  linkByTokenHash(hash: string): Promise<LinkRec | null>;
  linkById(id: string): Promise<LinkRec | null>;
  linksForEvent(eventId: string): Promise<LinkRec[]>;
  insertLink(rec: LinkRec): Promise<void>;
  updateLink(id: string, patch: Partial<Pick<LinkRec, "expiresAt" | "revokedAt" | "lastOpenedAt">>): Promise<void>;

  allowedPhone(eventId: string, phoneHash: string): Promise<AllowedPhoneRec | null>;
  addAllowedPhone(rec: AllowedPhoneRec): Promise<void>;

  latestOtp(phoneHash: string, purpose: OtpPurpose, linkId: string | null): Promise<OtpRec | null>;
  countOtpsSince(phoneHash: string, since: Date): Promise<number>;
  insertOtp(rec: OtpRec): Promise<void>;
  updateOtp(id: string, patch: Partial<Pick<OtpRec, "attempts" | "lockedUntil" | "consumedAt" | "expiresAt" | "sentAt">>): Promise<void>;

  insertSession(rec: LinkSessionRec): Promise<void>;
  sessionById(id: string): Promise<LinkSessionRec | null>;

  submissionById(id: string): Promise<SubmissionRec | null>;
  submissionByIdempotencyKey(key: string): Promise<SubmissionRec | null>;
  latestSubmission(scope: SubmissionScope): Promise<SubmissionRec | null>;
  createSubmission(w: NewSubmissionWrite): Promise<NewSubmissionResult>;
  /** "conflict" when the stored version no longer matches. */
  updateSubmission(w: SubmissionUpdateWrite): Promise<"ok" | "conflict">;

  insertAttachment(rec: AttachmentRec): Promise<void>;
  attachmentsByIds(ids: readonly string[]): Promise<AttachmentRec[]>;
  attachmentByIdempotencyKey(linkId: string, key: string): Promise<AttachmentRec | null>;
}
