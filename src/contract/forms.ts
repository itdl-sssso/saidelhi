// Form definitions, submissions and the form-link API (§4.3, §5.2).
import { z } from "zod";
import { Confidence, FormFieldKind, InboxState, LinkPurpose, LinkState, SevaType, Source, SubmissionStatus } from "./enums";
import { EventCard } from "./events";
import { I18nText, ISODateTime, Id, MaskedPhone } from "./primitives";

export const Rule = z.object({
  field: z.string(),
  op: z.enum(["eq", "neq", "gt", "gte", "lt", "lte", "in", "filled"]),
  value: z.unknown().optional(),
});
export type Rule = z.infer<typeof Rule>;

/**
 * Operands are a field id, a sum of field ids joined by "+" ("p10+p15+p20"), or
 * (right only) a number. Ids resolve within the same repeater row first.
 */
export const CrossRule = z.object({
  op: z.enum(["lte", "gte", "eq", "lt", "gt"]),
  left: z.string(),
  right: z.union([z.string(), z.number()]),
  level: z.enum(["error", "warn"]),
  message: I18nText,
});
export type CrossRule = z.infer<typeof CrossRule>;

export const FieldOption = z.object({ value: z.string(), label: I18nText });

/** Event values a field can be prefilled from (GET /links/:token/form → prefill). */
export const PrefillKey = z.enum(["samithi", "date", "venue", "partner"]);
export type PrefillKey = z.infer<typeof PrefillKey>;

export const FieldFormat = z.enum(["phone"]);
export type FieldFormat = z.infer<typeof FieldFormat>;

export type FormField = {
  id: string;
  kind: FormFieldKind;
  label: I18nText;
  help: I18nText | null;
  required: boolean;
  min: number | null;
  max: number | null;
  options?: { value: string; label: I18nText }[];
  showIf?: Rule;
  checks?: CrossRule[];
  warnAbove?: number;
  /** KPI key, optionally with a dimension: "eye.spectacles_by_power:+1.0". */
  kpi: string | null;
  locked: boolean;
  personal: boolean;
  fields?: FormField[];
  /** Filled from the event; with readOnly the server ignores submitted values. */
  prefill?: PrefillKey;
  readOnly?: boolean;
  /** yes/no that records consent for the personal fields in its row or section. */
  consent?: boolean;
  format?: FieldFormat;
  /** v0.7: days personal answers are kept (personal fields only; default per data kind). */
  retentionDays?: number;
};
export const FormField: z.ZodType<FormField> = z.object({
  id: z.string(),
  kind: FormFieldKind,
  label: I18nText,
  help: I18nText.nullable(),
  required: z.boolean(),
  min: z.number().nullable(),
  max: z.number().nullable(),
  options: z.array(FieldOption).optional(),
  showIf: Rule.optional(),
  checks: z.array(CrossRule).optional(),
  warnAbove: z.number().optional(),
  kpi: z.string().nullable(),
  locked: z.boolean(),
  personal: z.boolean(),
  get fields() {
    return z.array(FormField).optional();
  },
  prefill: PrefillKey.optional(),
  readOnly: z.boolean().optional(),
  consent: z.boolean().optional(),
  format: FieldFormat.optional(),
  retentionDays: z.number().int().min(1).max(3650).optional(),
});

/** Splits "key:dim" into its parts (dim '' = total). */
export function parseKpiRef(ref: string): { key: string; dim: string } {
  const i = ref.indexOf(":");
  return i < 0 ? { key: ref, dim: "" } : { key: ref.slice(0, i), dim: ref.slice(i + 1) };
}

export const FormSection = z.object({
  id: z.string(),
  title: I18nText,
  fields: z.array(FormField),
  personalData: z.boolean(),
});
export type FormSection = z.infer<typeof FormSection>;

export const FormDefinition = z.object({
  id: Id,
  templateId: Id,
  version: z.number().int().positive(),
  sevaType: SevaType,
  title: I18nText,
  sections: z.array(FormSection),
});
export type FormDefinition = z.infer<typeof FormDefinition>;

export const Answers = z.record(z.string(), z.unknown());
export type Answers = z.infer<typeof Answers>;

export const Submission = z.object({
  id: Id,
  eventId: Id,
  linkId: Id,
  definitionVersion: z.number().int().positive(),
  /** Includes personal-section answers only for the link session that sent them. */
  answers: Answers,
  submittedAt: ISODateTime,
  /** Masked; '' for public sign-ups without a verified phone. */
  submittedBy: MaskedPhone,
  source: Source,
  status: SubmissionStatus,
  /** Send back on PATCH; mismatch → 409. */
  version: z.number().int().positive(),
});
export type Submission = z.infer<typeof Submission>;

// ---- Form links (§5.2) -------------------------------------------------------

/** Path params. Any malformed token is answered like an unknown one (404). */
export const LinkTokenParams = z.object({ token: z.string().min(1).max(128) });
export const LinkSubmissionParams = LinkTokenParams.extend({ id: Id });

/** GET /links/:token */
export const LinkInfo = z.object({
  state: LinkState,
  purpose: LinkPurpose,
  event: EventCard.nullable(),
  otpRequired: z.boolean(),
  deskLabel: z.string().nullable(),
  expiresAt: ISODateTime,
  /** Signed bot-check challenge for POST /public (public links and desk links without OTP). */
  botChallenge: z.string().nullable(),
  /** true when the request already carries a valid `fsid` session for this link. */
  hasSession: z.boolean(),
});
export type LinkInfo = z.infer<typeof LinkInfo>;

/** `error.details` of 410 LINK_EXPIRED / LINK_REVOKED / LINK_USED_UP (event only for expired and revoked, spec 22). */
export const LinkGoneDetails = z.object({ link: LinkInfo });
export type LinkGoneDetails = z.infer<typeof LinkGoneDetails>;

/** POST /links/:token/otp */
export const OtpRequest = z.object({ phone: z.string().trim().min(8).max(20) });
export type OtpRequest = z.infer<typeof OtpRequest>;

/** 202 body of POST /links/:token/otp (sent whether or not a code went out, except PHONE_NOT_LISTED). */
export const OtpSent = z.object({ resendAfter: z.number().int().nonnegative(), expiresIn: z.number().int().positive() });
export type OtpSent = z.infer<typeof OtpSent>;

/** POST /links/:token/verify */
export const VerifyRequest = z.object({
  phone: z.string().trim().min(8).max(20),
  code: z.string().trim().regex(/^\d{6}$/),
});
export type VerifyRequest = z.infer<typeof VerifyRequest>;

/** POST /links/:token/public. `website` is a honeypot; leave it empty. */
export const PublicSessionRequest = z.object({
  botToken: z.string().min(1).max(512),
  website: z.string().max(200).optional(),
});
export type PublicSessionRequest = z.infer<typeof PublicSessionRequest>;

/** Body of verify/public. Also sets cookies `fsid` (httpOnly) and `csrf` (send back as `x-csrf`). */
export const LinkSession = z.object({ expiresAt: ISODateTime, csrf: z.string() });
export type LinkSession = z.infer<typeof LinkSession>;

/** GET /links/:token/form */
export const FormPayload = z.object({
  purpose: LinkPurpose,
  event: EventCard,
  definition: FormDefinition,
  prefill: Answers,
  existing: Submission.nullable(),
  editable: z.boolean(),
});
export type FormPayload = z.infer<typeof FormPayload>;

/** POST /links/:token/submissions (header `Idempotency-Key` required). */
export const SubmissionInput = z.object({ answers: Answers });
export type SubmissionInput = z.infer<typeof SubmissionInput>;

/** PATCH /links/:token/submissions/:id */
export const SubmissionPatch = z.object({ answers: Answers, version: z.number().int().positive() });
export type SubmissionPatch = z.infer<typeof SubmissionPatch>;

/** 201 body of POST /links/:token/attachments (multipart: `file`, `fieldId`). Never public. */
export const LinkAttachment = z.object({
  id: Id,
  fieldId: z.string(),
  name: z.string(),
  mime: z.string(),
  size: z.number().int().nonnegative(),
  uploadedAt: ISODateTime,
});
export type LinkAttachment = z.infer<typeof LinkAttachment>;

export const ATTACHMENT_LIMITS = {
  maxBytes: 10 * 1024 * 1024,
  mimes: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
} as const;

export const InboxRaw = z.object({
  kind: z.enum(["text", "image", "pdf", "spreadsheet", "voice"]),
  text: z.string().nullable(),
  mediaUrl: z.string().nullable(),
});
export type InboxRaw = z.infer<typeof InboxRaw>;

export const InboxItem = z.object({
  id: Id,
  source: Source,
  sender: MaskedPhone,
  receivedAt: ISODateTime,
  matchedEvent: z.object({ id: Id, title: I18nText }).nullable(),
  confidence: Confidence,
  ageDays: z.number().int().nonnegative(),
  raw: InboxRaw,
  draft: z.object({
    answers: z.record(z.string(), z.unknown()),
    fieldConfidence: z.record(z.string(), z.object({ level: Confidence, why: I18nText.nullable() })),
  }),
  state: InboxState,
});
export type InboxItem = z.infer<typeof InboxItem>;
