// M2/M4 shapes. Complete enough to type against; details may grow with the milestone.
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

export const CrossRule = z.object({
  op: z.enum(["lte", "gte", "eq", "lt", "gt"]),
  left: z.string(),
  right: z.union([z.string(), z.number()]),
  level: z.enum(["error", "warn"]),
  message: I18nText,
});
export type CrossRule = z.infer<typeof CrossRule>;

export const FieldOption = z.object({ value: z.string(), label: I18nText });

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
  kpi: string | null;
  locked: boolean;
  personal: boolean;
  fields?: FormField[];
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
});

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

export const Submission = z.object({
  id: Id,
  eventId: Id,
  linkId: Id,
  definitionVersion: z.number().int().positive(),
  answers: z.record(z.string(), z.unknown()),
  submittedAt: ISODateTime,
  submittedBy: MaskedPhone,
  source: Source,
  status: SubmissionStatus,
});
export type Submission = z.infer<typeof Submission>;

/** GET /links/:token */
export const LinkInfo = z.object({
  state: LinkState,
  purpose: LinkPurpose,
  event: EventCard.nullable(),
  otpRequired: z.boolean(),
  deskLabel: z.string().nullable(),
});
export type LinkInfo = z.infer<typeof LinkInfo>;

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
