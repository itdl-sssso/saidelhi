// Form templates/versions, form links, OTP, link sessions, submissions,
// private attachments and consent (contract §7, M2).
import {
  boolean,
  char,
  datetime,
  index,
  int,
  json,
  mysqlTable,
  smallint,
  text,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";
import type { FormDefinition, LinkPurpose, SevaType, Source, SubmissionStatus } from "@/contract";
import { createdAt, idPk, idRef, timestamps } from "../columns";
import { event } from "./events";

export type FormVersionStatus = "draft" | "published";
export type OtpPurpose = "login" | "link";

export const formTemplate = mysqlTable(
  "form_template",
  {
    id: idPk(),
    code: varchar("code", { length: 64 }).notNull(),
    sevaType: varchar("seva_type", { length: 32 }).$type<SevaType>(),
    purpose: varchar("purpose", { length: 16 }).$type<LinkPurpose>().notNull(),
    titleEn: varchar("title_en", { length: 200 }).notNull(),
    titleHi: varchar("title_hi", { length: 200 }),
    active: boolean("active").notNull().default(true),
    ...timestamps(),
  },
  (t) => [uniqueIndex("form_template_code_uq").on(t.code), index("form_template_seva_idx").on(t.sevaType, t.purpose)],
);

/** Published versions are immutable; events and links lock the version they were issued with. */
export const formVersion = mysqlTable(
  "form_version",
  {
    id: idPk(),
    templateId: idRef("template_id")
      .notNull()
      .references(() => formTemplate.id),
    version: int("version").notNull(),
    status: varchar("status", { length: 16 }).$type<FormVersionStatus>().notNull().default("draft"),
    /** Validated with the contract FormDefinition schema before every write. */
    definition: json("definition").$type<FormDefinition>().notNull(),
    publishedAt: datetime("published_at", { mode: "date" }),
    publishedBy: idRef("published_by"),
    /** Draft revision counter (optimistic concurrency for the builder). */
    rev: int("rev").notNull().default(1),
    createdBy: idRef("created_by"),
    ...timestamps(),
  },
  (t) => [uniqueIndex("form_version_template_version_uq").on(t.templateId, t.version)],
);

export const formLink = mysqlTable(
  "form_link",
  {
    id: idPk(),
    /** sha256 of the token; the token itself is never stored (see security/link-token.ts). */
    tokenHash: char("token_hash", { length: 64 }).notNull(),
    tokenNonce: varchar("token_nonce", { length: 64 }).notNull(),
    eventId: idRef("event_id")
      .notNull()
      .references(() => event.id, { onDelete: "cascade" }),
    purpose: varchar("purpose", { length: 16 }).$type<LinkPurpose>().notNull(),
    label: varchar("label", { length: 120 }).notNull(),
    formVersionId: idRef("form_version_id")
      .notNull()
      .references(() => formVersion.id),
    /** 'phone' (WhatsApp), 'qr' (poster) or null. */
    sentToKind: varchar("sent_to_kind", { length: 8 }).$type<"phone" | "qr">(),
    /** AES-GCM sealed E.164 (needed to resend); never returned. */
    sentToEnc: varchar("sent_to_enc", { length: 160 }),
    sentToHash: char("sent_to_hash", { length: 64 }),
    sentToMasked: varchar("sent_to_masked", { length: 24 }),
    expiresAt: datetime("expires_at", { mode: "date" }).notNull(),
    maxUses: int("max_uses"),
    uses: int("uses").notNull().default(0),
    revokedAt: datetime("revoked_at", { mode: "date" }),
    otpRequired: boolean("otp_required").notNull().default(true),
    createdBy: idRef("created_by"),
    lastOpenedAt: datetime("last_opened_at", { mode: "date" }),
    version: int("version").notNull().default(1),
    ...timestamps(),
  },
  (t) => [uniqueIndex("form_link_token_hash_uq").on(t.tokenHash), index("form_link_event_idx").on(t.eventId, t.purpose)],
);

/** Coordinators allowed to open an event's report links (spec 19 "Phone not on this event's list"). */
export const linkAllowedPhone = mysqlTable(
  "link_allowed_phone",
  {
    id: idPk(),
    eventId: idRef("event_id")
      .notNull()
      .references(() => event.id, { onDelete: "cascade" }),
    phoneHash: char("phone_hash", { length: 64 }).notNull(),
    phoneEnc: varchar("phone_enc", { length: 160 }).notNull(),
    phoneMasked: varchar("phone_masked", { length: 24 }).notNull(),
    label: varchar("label", { length: 120 }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("link_allowed_phone_uq").on(t.eventId, t.phoneHash)],
);

export const otpChallenge = mysqlTable(
  "otp_challenge",
  {
    id: idPk(),
    phoneHash: char("phone_hash", { length: 64 }).notNull(),
    purpose: varchar("purpose", { length: 8 }).$type<OtpPurpose>().notNull(),
    linkId: idRef("link_id").references(() => formLink.id, { onDelete: "cascade" }),
    /** HMAC(secret, id + code). */
    codeHash: char("code_hash", { length: 64 }).notNull(),
    attempts: smallint("attempts").notNull().default(0),
    lockedUntil: datetime("locked_until", { mode: "date" }),
    expiresAt: datetime("expires_at", { mode: "date" }).notNull(),
    sentAt: datetime("sent_at", { mode: "date", fsp: 3 }).notNull(),
    consumedAt: datetime("consumed_at", { mode: "date" }),
    createdAt: createdAt(),
  },
  (t) => [index("otp_challenge_lookup_idx").on(t.phoneHash, t.purpose, t.linkId, t.sentAt)],
);

export const linkSession = mysqlTable(
  "link_session",
  {
    /** sha256 of the `fsid` cookie value. */
    id: char("id", { length: 64 }).primaryKey(),
    linkId: idRef("link_id")
      .notNull()
      .references(() => formLink.id, { onDelete: "cascade" }),
    /** null for public/bot-checked sessions. */
    phoneHash: char("phone_hash", { length: 64 }),
    phoneMasked: varchar("phone_masked", { length: 24 }),
    expiresAt: datetime("expires_at", { mode: "date" }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("link_session_link_idx").on(t.linkId)],
);

export const submission = mysqlTable(
  "submission",
  {
    id: idPk(),
    eventId: idRef("event_id")
      .notNull()
      .references(() => event.id, { onDelete: "cascade" }),
    linkId: idRef("link_id").references(() => formLink.id),
    /** Public sign-ups: the session that sent it (so it can be shown back). */
    sessionId: char("session_id", { length: 64 }),
    formVersionId: idRef("form_version_id")
      .notNull()
      .references(() => formVersion.id),
    definitionVersion: int("definition_version").notNull(),
    /** Validated, non-personal answers. */
    answers: json("answers").$type<Record<string, unknown>>().notNull(),
    /** Answers from personal-data sections (restricted; follow-up list, sign-up contact). */
    personalAnswers: json("personal_answers").$type<Record<string, unknown>>(),
    submittedByHash: char("submitted_by_hash", { length: 64 }),
    submittedByMasked: varchar("submitted_by_masked", { length: 24 }).notNull().default(""),
    source: varchar("source", { length: 16 }).$type<Source>().notNull().default("form"),
    status: varchar("status", { length: 24 }).$type<SubmissionStatus>().notNull().default("submitted"),
    idempotencyKey: varchar("idempotency_key", { length: 100 }),
    version: int("version").notNull().default(1),
    submittedAt: datetime("submitted_at", { mode: "date", fsp: 3 }).notNull(),
    approvedAt: datetime("approved_at", { mode: "date" }),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("submission_idempotency_uq").on(t.idempotencyKey),
    index("submission_event_idx").on(t.eventId, t.status),
    index("submission_link_idx").on(t.linkId),
  ],
);

/** Private files (register photos). Stored under MEDIA_PRIVATE_ROOT, never public. */
export const attachment = mysqlTable(
  "attachment",
  {
    id: idPk(),
    eventId: idRef("event_id")
      .notNull()
      .references(() => event.id, { onDelete: "cascade" }),
    linkId: idRef("link_id").references(() => formLink.id),
    submissionId: idRef("submission_id").references(() => submission.id, { onDelete: "set null" }),
    fieldId: varchar("field_id", { length: 64 }),
    /** Relative to MEDIA_PRIVATE_ROOT. */
    path: varchar("path", { length: 255 }).notNull(),
    originalName: varchar("original_name", { length: 255 }).notNull(),
    mime: varchar("mime", { length: 64 }).notNull(),
    size: int("size").notNull(),
    sha256: char("sha256", { length: 64 }).notNull(),
    uploadedByHash: char("uploaded_by_hash", { length: 64 }),
    idempotencyKey: varchar("idempotency_key", { length: 100 }),
    retentionUntil: datetime("retention_until", { mode: "date" }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    index("attachment_event_idx").on(t.eventId),
    index("attachment_submission_idx").on(t.submissionId),
    uniqueIndex("attachment_idempotency_uq").on(t.linkId, t.idempotencyKey),
  ],
);

/** One row per person/record whose personal data was collected with consent. */
export const consentRecord = mysqlTable(
  "consent_record",
  {
    id: idPk(),
    submissionId: idRef("submission_id")
      .notNull()
      .references(() => submission.id, { onDelete: "cascade" }),
    eventId: idRef("event_id")
      .notNull()
      .references(() => event.id, { onDelete: "cascade" }),
    /** e.g. 'followup.3' or 'you'. */
    subjectRef: varchar("subject_ref", { length: 80 }).notNull(),
    purpose: varchar("purpose", { length: 32 }).notNull(),
    /** Label text (EN) the person agreed to, for the record. */
    statement: text("statement").notNull(),
    method: varchar("method", { length: 16 }).notNull().default("form"),
    recordedByHash: char("recorded_by_hash", { length: 64 }),
    givenAt: datetime("given_at", { mode: "date" }).notNull(),
    withdrawnAt: datetime("withdrawn_at", { mode: "date" }),
    createdAt: createdAt(),
  },
  (t) => [index("consent_record_submission_idx").on(t.submissionId)],
);
