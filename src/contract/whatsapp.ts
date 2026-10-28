// M4 contract (v0.5): review inbox, WhatsApp admin, public opt-in, dev bot
// simulator. docs/CONTRACT.md §10 v0.5 + specs 28, 42, 50.
import { z } from "zod";
import { Confidence, InboxState, Role, SevaType, Source } from "./enums";
import { FormDefinition, InboxRaw } from "./forms";
import { I18nText, ISODate, ISODateTime, Id, Locale, MaskedPhone, PageMeta } from "./primitives";
import { opt, Pagination } from "./queries";

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

export const InboxIdParams = z.object({ id: Id });
/** GET /admin/inbox/:id/media?m=<message id> (private file, audited). */
export const InboxMediaQuery = z.object({ m: opt(Id) });

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

export const WaLogQuery = Pagination.extend({ q: opt(z.string().trim().max(80)) });
export type WaLogQuery = z.infer<typeof WaLogQuery>;

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

/** GET /whatsapp/optin → the bot-check token to send back as `botToken` (valid 1.5 s – 30 min after issue). */
export const OptInChallenge = z.object({ botToken: z.string() });
export type OptInChallenge = z.infer<typeof OptInChallenge>;

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
  /** v0.9.5: `data` = base64 file bytes (≤ ~14 MB string) so the simulator can send a real photo; absent = fake media without bytes. */
  media: z.object({ kind: z.enum(["image", "pdf"]), name: z.string(), mime: z.string().max(100).optional(), data: z.string().max(14_000_000).optional() }).nullable(),
});
export type SimInboundBody = z.infer<typeof SimInboundBody>;
/** GET /dev/whatsapp/messages?phone → both directions, oldest first. */
export const SimMessage = z.object({ dir: z.enum(["in", "out"]), at: ISODateTime, text: z.string().nullable(), out: WaOutbound.nullable() });
export type SimMessage = z.infer<typeof SimMessage>;

/**
 * Event details read from a WhatsApp message, one shape for every seva type
 * (bhajan, eye camp, blood donation, Narayan Seva, Bal Vikas, relief drive…).
 * Only a draft for Plan event / the review inbox: a person checks it before
 * anything is saved. Fields the message does not state are null (lists empty).
 * Values are copied as written, except dates/times, which are normalised (v0.9.3).
 */
export const EventExtractKind = z.enum(["announcement", "report", "other"]);
export type EventExtractKind = z.infer<typeof EventExtractKind>;

const HHMM = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const Written = z.string().min(1).max(300);

export const EventExtract = z.object({
  /** announcement = upcoming event; report = something that already happened; other = no event (greeting, quote, question). */
  kind: EventExtractKind,
  sevaType: SevaType.nullable(),
  /** Headline as written, greeting dropped ("GGN 4 Samithi bhajan"). */
  title: Written.nullable(),
  /** `raw` as written ("GGN 4"); `slug`/`name` of the matched samithi in sssso-units, null when unknown. */
  samithi: z.object({ raw: Written, slug: z.string().nullable(), name: z.string().nullable() }).nullable(),

  // When — IST. `endDate` only for multi-day events.
  date: ISODate.nullable(),
  endDate: ISODate.nullable(),
  /** 'HH:MM', 24 h. */
  startTime: HHMM.nullable(),
  endTime: HHMM.nullable(),
  /** date + time as instants, ready for EventInput.startsAt / endsAt. */
  startsAt: ISODateTime.nullable(),
  endsAt: ISODateTime.nullable(),
  /** Repeats ("every Thursday"): text as written + weekday (0 = Sunday) when one is named. */
  recurrence: z.object({ text: Written, weekday: z.number().int().min(0).max(6).nullable() }).nullable(),

  // Where
  venueName: Written.nullable(),
  venueAddress: Written.nullable(),

  // What
  /** Hospital, blood bank, school or NGO running it with us. */
  partner: Written.nullable(),
  /** Study circle topic, bhajan theme, talk subject. */
  topic: Written.nullable(),
  /** Who it is for ("children 5–9 years", "ladies", "all devotees"). */
  audience: Written.nullable(),
  /** What is offered ("free eye check-up", "spectacles", "medicines"). */
  services: z.array(Written).max(20),
  /** What to bring (attendees or sevadals): "Aadhaar card", "old clothes". */
  bring: z.array(Written).max(20),

  // Who
  volunteersNeeded: z.number().int().min(0).max(10_000).nullable(),
  /** Goal stated in the message ("100 donors", "500 meals"). */
  target: z.object({ count: z.number().int().min(0), unit: Written }).nullable(),
  /** Contact as written in the message (public announcement text). */
  contact: z.object({ name: Written.nullable(), phone: z.string().max(20).nullable() }).nullable(),
  /** Instruction for sevadals ("Please reach before 10 minutes"). */
  sevadalNote: Written.nullable(),

  /** Keyed by field name above; only fields that were filled. */
  fieldConfidence: z.record(z.string(), z.object({ level: Confidence, why: I18nText.nullable() })),
  /** Model values that failed the type check or could not be found in the message (dropped). */
  rejected: z.array(z.object({ field: z.string(), value: z.string(), reason: z.string() })),
  /** "rules" or "rules+LFM2.5-350M-ONNX". */
  model: z.string(),
});
export type EventExtract = z.infer<typeof EventExtract>;

/** POST /admin/events/extract — a pasted WhatsApp message, or the text of an inbox item the viewer can review. */
export const EventFromMessageBody = z.union([z.object({ text: z.string().trim().min(3).max(4000) }), z.object({ inboxId: Id })]);
export type EventFromMessageBody = z.infer<typeof EventFromMessageBody>;

/** Plan event fields the form may still need checked (blank, or not certain). */
export const PlanField = z.enum(["sevaType", "title", "startsAt", "endsAt", "samithiId", "venueName", "venueAddress", "volunteersNeeded", "bring", "description"]);
export type PlanField = z.infer<typeof PlanField>;

/** Plan event prefill read from a message. Nothing is saved; the coordinator reviews the form. */
export const EventFromMessage = z.object({
  extract: EventExtract,
  prefill: z.object({
    sevaType: SevaType.nullable(),
    title: z.string().nullable(),
    /** IST day and 'HH:MM' times, as the Plan event form takes them. */
    date: ISODate.nullable(),
    startTime: z.string().nullable(),
    endTime: z.string().nullable(),
    /** Only when the samithi named in the message is in the viewer's scope. */
    samithiId: Id.nullable(),
    venueName: z.string().nullable(),
    venueAddress: z.string().nullable(),
    volunteersNeeded: z.number().int().nullable(),
    bring: z.array(z.string()),
    /** English description lines from topic, audience, partner, services, recurrence and the sevadal note. Contact is left out. */
    description: z.string(),
    recurring: z.boolean(),
  }),
  /** Fields the message gave with less than high confidence, or that the form still needs. */
  check: z.array(PlanField),
});
export type EventFromMessage = z.infer<typeof EventFromMessage>;
