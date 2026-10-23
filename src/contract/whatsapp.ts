// M4 contract (v0.5): review inbox, WhatsApp admin, public opt-in, dev bot
// simulator. docs/CONTRACT.md §10 v0.5 + specs 28, 42, 50.
import { z } from "zod";
import { Confidence, InboxState, Role, SevaType, Source } from "./enums";
import { FormDefinition, InboxRaw } from "./forms";
import { I18nText, ISODateTime, Id, Locale, MaskedPhone, PageMeta } from "./primitives";

// ── Review inbox (spec 28) ───────────────────────────────────────────────────

/** GET /admin/inbox?tab&page&pageSize → { data: InboxRow[], meta: PageMeta & { counts } } */
export const InboxRow = z.object({
  id: Id,
  source: Source,
  sender: MaskedPhone,
  receivedAt: ISODateTime,
  matchedEvent: z.object({ id: Id, title: I18nText }).nullable(),
  confidence: Confidence,
  ageDays: z.number().int().nonnegative(),
  state: InboxState,
  /** One-line preview of the source (first 120 chars of text, or file name). */
  preview: z.string(),
});
export type InboxRow = z.infer<typeof InboxRow>;

export const InboxListMeta = PageMeta.extend({
  counts: z.object({ for_me: z.number().int(), escalated: z.number().int(), done: z.number().int() }),
});
export type InboxListMeta = z.infer<typeof InboxListMeta>;

export const InboxQuery = z.object({
  tab: InboxState.default("for_me"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type InboxQuery = z.infer<typeof InboxQuery>;

/** One bubble of the source WhatsApp thread (left pane). */
export const ThreadMessage = z.object({
  id: Id,
  dir: z.enum(["in", "out"]),
  at: ISODateTime,
  text: z.string().nullable(),
  /** Authorised, private URL (served via /admin/attachments/:id). */
  media: z.object({ kind: z.enum(["image", "pdf", "spreadsheet", "voice"]), url: z.string(), name: z.string() }).nullable(),
});
export type ThreadMessage = z.infer<typeof ThreadMessage>;

export const InboxHistoryEntry = z.object({
  action: z.enum(["ai_drafted", "edited", "matched", "approved", "escalated", "rejected", "asked", "sender_replied"]),
  by: z.object({ role: Role.nullable(), label: z.string() }),
  at: ISODateTime,
  note: z.string().nullable(),
});
export type InboxHistoryEntry = z.infer<typeof InboxHistoryEntry>;

/** GET /admin/inbox/:id */
export const InboxDetail = z.object({
  id: Id,
  source: Source,
  sender: MaskedPhone,
  receivedAt: ISODateTime,
  state: InboxState,
  confidence: Confidence,
  ageDays: z.number().int().nonnegative(),
  raw: InboxRaw,
  /** WhatsApp source only; [] otherwise. */
  thread: z.array(ThreadMessage),
  matchedEvent: z.object({ id: Id, title: I18nText, startsAt: ISODateTime }).nullable(),
  /** Candidate events for the match selector (same samithi/district, ±14 days). */
  candidates: z.array(z.object({ id: Id, title: I18nText, startsAt: ISODateTime })),
  /** Form of the matched event (null until matched). */
  definition: FormDefinition.nullable(),
  draft: z.object({
    answers: z.record(z.string(), z.unknown()),
    fieldConfidence: z.record(z.string(), z.object({ level: Confidence, why: I18nText.nullable() })),
  }),
  aiDraftedAt: ISODateTime.nullable(),
  /** "rules" | "smollm2:1.7b" … shown in footer for transparency. */
  aiModel: z.string().nullable(),
  history: z.array(InboxHistoryEntry),
  /** Which actions the viewer may take now. */
  can: z.object({ approve: z.boolean(), edit: z.boolean(), escalate: z.boolean(), reject: z.boolean(), ask: z.boolean() }),
  version: z.number().int(),
});
export type InboxDetail = z.infer<typeof InboxDetail>;

/** PATCH /admin/inbox/:id */
export const InboxPatchBody = z.object({
  version: z.number().int(),
  answers: z.record(z.string(), z.unknown()).optional(),
  eventId: Id.nullable().optional(),
});
export type InboxPatchBody = z.infer<typeof InboxPatchBody>;

/** POST /admin/inbox/:id/approve — creates a submission (source whatsapp|upload|scan) on the event, event → report_submitted. */
export const InboxApproveBody = z.object({ version: z.number().int(), eventId: Id, answers: z.record(z.string(), z.unknown()) });
export const InboxEscalateBody = z.object({ version: z.number().int(), note: z.string().max(500).optional() });
/** Reason is sent back to the sender on WhatsApp. */
export const InboxRejectBody = z.object({ version: z.number().int(), reason: z.string().min(3).max(500) });
/** Question is sent to the sender on WhatsApp; their reply appends to the thread. */
export const InboxAskBody = z.object({ version: z.number().int(), question: z.string().min(3).max(500) });
export type InboxApproveBody = z.infer<typeof InboxApproveBody>;
export type InboxEscalateBody = z.infer<typeof InboxEscalateBody>;
export type InboxRejectBody = z.infer<typeof InboxRejectBody>;
export type InboxAskBody = z.infer<typeof InboxAskBody>;

// ── WhatsApp admin (spec 42) ─────────────────────────────────────────────────

export const WaTemplateCategory = z.enum(["otp", "reminder", "approval", "broadcast", "link", "general"]);
export type WaTemplateCategory = z.infer<typeof WaTemplateCategory>;

/** GET /admin/whatsapp/templates */
export const WaTemplate = z.object({
  id: Id,
  name: z.string(),
  category: WaTemplateCategory,
  text: I18nText,
  metaStatus: z.enum(["approved", "pending", "rejected", "not_required"]),
});
export type WaTemplate = z.infer<typeof WaTemplate>;

/** GET /admin/whatsapp/reminders · PATCH /admin/whatsapp/reminders/:id { enabled } */
export const ReminderRule = z.object({
  id: Id,
  key: z.enum(["day_before", "day_after_no_report", "plus3_no_report", "plus7_no_report", "approval_day2"]),
  label: I18nText,
  description: I18nText,
  enabled: z.boolean(),
  copyDistrict: z.boolean(),
});
export type ReminderRule = z.infer<typeof ReminderRule>;
export const ReminderPatchBody = z.object({ enabled: z.boolean() });
export type ReminderPatchBody = z.infer<typeof ReminderPatchBody>;

/** POST /admin/whatsapp/broadcasts — dryRun:true → estimate only, nothing sent. Only opted-in numbers. */
export const BroadcastBody = z.object({
  districtIds: z.array(Id),
  sevaTypes: z.array(SevaType),
  text: z.object({ en: z.string().min(1).max(1000), hi: z.string().max(1000).nullable() }),
  dryRun: z.boolean(),
});
export type BroadcastBody = z.infer<typeof BroadcastBody>;
export const BroadcastResult = z.object({
  recipients: z.number().int().nonnegative(),
  estimatedCostInr: z.number().nonnegative(),
  sent: z.boolean(),
  broadcastId: Id.nullable(),
});
export type BroadcastResult = z.infer<typeof BroadcastResult>;

/** GET /admin/whatsapp/log?q&page → Paged<ConversationRow> */
export const ConversationRow = z.object({
  id: Id,
  phone: MaskedPhone,
  who: z.object({ role: Role.nullable(), label: z.string() }),
  lastAt: ISODateTime,
  lastText: z.string(),
  messages: z.number().int().nonnegative(),
  locale: Locale,
});
export type ConversationRow = z.infer<typeof ConversationRow>;
/** GET /admin/whatsapp/log/:id */
export const ConversationDetail = ConversationRow.extend({ thread: z.array(ThreadMessage) });
export type ConversationDetail = z.infer<typeof ConversationDetail>;

/** GET /admin/whatsapp/status */
export const WaStatus = z.object({
  provider: z.enum(["console", "cloud"]),
  number: MaskedPhone.nullable(),
  coexistence: z.boolean(),
  monthMessages: z.number().int().nonnegative(),
  monthCostInr: z.number().nonnegative(),
  optedIn: z.number().int().nonnegative(),
});
export type WaStatus = z.infer<typeof WaStatus>;

// ── Public opt-in (Join / Calendar) ──────────────────────────────────────────

/** POST /whatsapp/optin → 202 (neutral). Sends a confirm message; consent recorded on reply YES. */
export const OptInBody = z.object({
  phone: z.string().min(10).max(16),
  districtId: Id.nullable(),
  sevaTypes: z.array(SevaType),
  locale: Locale,
  botToken: z.string(),
});
export type OptInBody = z.infer<typeof OptInBody>;

// ── Dev bot simulator (DATA/WHATSAPP_PROVIDER=console only; 404 in production) ─

export const WaButton = z.object({ id: z.string(), title: z.string().max(20) });
export const WaListRow = z.object({ id: z.string(), title: z.string().max(24), description: z.string().max(72).nullable() });

/** Outbound message as the bot would send it (also the shape logged by the console provider). */
export const WaOutbound = z.object({
  id: Id,
  to: z.string(),
  at: ISODateTime,
  kind: z.enum(["text", "buttons", "list", "template"]),
  text: z.string(),
  buttons: z.array(WaButton).nullable(),
  list: z.object({ button: z.string(), sections: z.array(z.object({ title: z.string(), rows: z.array(WaListRow) })) }).nullable(),
  template: z.string().nullable(),
});
export type WaOutbound = z.infer<typeof WaOutbound>;

/** POST /dev/whatsapp/inbound — simulate a user message; `replyId` = tapped button/list row id. Returns bot replies. */
export const SimInboundBody = z.object({
  from: z.string(),
  text: z.string().nullable(),
  replyId: z.string().nullable(),
  media: z.object({ kind: z.enum(["image", "pdf"]), name: z.string() }).nullable(),
});
export type SimInboundBody = z.infer<typeof SimInboundBody>;
/** GET /dev/whatsapp/messages?phone → both directions, oldest first. */
export const SimMessage = z.object({ dir: z.enum(["in", "out"]), at: ISODateTime, text: z.string().nullable(), out: WaOutbound.nullable() });
export type SimMessage = z.infer<typeof SimMessage>;
