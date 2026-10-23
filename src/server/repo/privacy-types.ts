// Storage port for the privacy desk (spec 47): DPDP requests and the cross-source
// reads/erasure/retention purges that touch personal data. MySQL + in-memory impls.
import type { PrivacyRequestStatus } from "@/contract";
import type { AuditRec, PrivacyRequestRec } from "./types";

export interface PrivacyRequestFull extends PrivacyRequestRec {
  status: PrivacyRequestStatus;
  assigneeId: string | null;
  handledBy: string | null;
  closedAt: Date | null;
  /** `step@iso` entries (found, exported, erased, replied). */
  steps: string[];
  version: number;
  createdAt: Date;
}

export interface PrivacyRequestPatchRec {
  status?: PrivacyRequestStatus;
  assigneeId?: string | null;
  closedAt?: Date | null;
  steps?: string[];
}

export interface PersonalSubmission {
  id: string;
  eventId: string;
  linkId: string | null;
  submittedAt: Date;
  personalAnswers: Record<string, unknown>;
}

export interface ConsentRow {
  templateId: string;
  purpose: string;
  givenAt: Date;
  withdrawnAt: Date | null;
}

export interface MediaRef {
  id: string;
  path: string;
}

export interface PrivacyRepo {
  /** Oldest first (the "PR-0001" reference follows this order). */
  requests(): Promise<PrivacyRequestFull[]>;
  requestById(id: string): Promise<PrivacyRequestFull | null>;
  updateRequest(id: string, patch: PrivacyRequestPatchRec, expectVersion: number, audit?: AuditRec[]): Promise<"ok" | "conflict">;
  deleteRequests(ids: readonly string[], audit?: AuditRec[]): Promise<number>;

  /** Submissions that hold personal answers. */
  personalSubmissions(): Promise<PersonalSubmission[]>;
  /** Nulls `personal_answers` of these submissions; answers (counts) stay. */
  clearPersonal(ids: readonly string[], audit?: AuditRec[]): Promise<number>;
  /** Replaces one submission's personal answers (null clears them). */
  writePersonal(id: string, value: Record<string, unknown> | null, audit?: AuditRec[]): Promise<void>;
  deleteOptIn(id: string): Promise<boolean>;

  /** Every consent_record with the form template it was given on. */
  consentRows(): Promise<ConsentRow[]>;
  optinCounts(): Promise<{ optedIn: number; pending: number; stopped: number }>;

  /** whatsapp_message rows older than `before` that still carry text, payload or media. */
  messagesDue(before: Date): Promise<number>;
  /** Blanks text/payload/media of those rows; returns the media paths to delete from storage. */
  scrubMessages(before: Date): Promise<{ count: number; media: string[] }>;
  /** Finished inbox items received before `before` that still point at media. */
  inboxMediaDue(before: Date): Promise<MediaRef[]>;
  clearInboxMedia(ids: readonly string[]): Promise<void>;
  /** Private attachments whose `retention_until` has passed. */
  attachmentsDue(now: Date): Promise<MediaRef[]>;
  deleteAttachments(ids: readonly string[]): Promise<void>;
  /** Used or expired login codes. */
  otpDue(before: Date): Promise<number>;
  deleteOtp(before: Date): Promise<number>;
}
