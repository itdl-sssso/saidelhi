// WhatsApp bot, review inbox and opt-in (contract v0.5, M4). Phone numbers are
// stored sealed (AES-GCM) with a keyed hash for lookups and a masked form for
// display; message payloads never contain raw phones.
import { bigint, boolean, char, datetime, index, int, json, mysqlTable, text, uniqueIndex, varchar } from "drizzle-orm/mysql-core";
import type { Confidence, InboxState, Locale, Role, SevaType, Source } from "@/contract";
import { createdAt, idPk, idRef, timestamps } from "../columns";

export type BotStateJson = { flow: string | null; step: string | null; data: Record<string, unknown> };

export const whatsappConversation = mysqlTable(
  "whatsapp_conversation",
  {
    id: idPk(),
    phoneHash: char("phone_hash", { length: 64 }).notNull(),
    phoneEnc: varchar("phone_enc", { length: 160 }).notNull(),
    phoneMasked: varchar("phone_masked", { length: 24 }).notNull(),
    /** null until the person picks a language (asked once, then remembered). */
    locale: varchar("locale", { length: 2 }).$type<Locale>(),
    /** Registered portal user for this number, when there is one. */
    userId: idRef("user_id"),
    flow: varchar("flow", { length: 32 }),
    state: json("state").$type<BotStateJson>().notNull(),
    /** Flow state is discarded after this instant (30 minutes idle). */
    expiresAt: datetime("expires_at", { mode: "date" }),
    /** Start of the 24-hour customer-service window. */
    lastInboundAt: datetime("last_inbound_at", { mode: "date" }),
    lastAt: datetime("last_at", { mode: "date" }).notNull(),
    lastText: varchar("last_text", { length: 200 }).notNull().default(""),
    messageCount: int("message_count").notNull().default(0),
    ...timestamps(),
  },
  (t) => [uniqueIndex("whatsapp_conversation_phone_uq").on(t.phoneHash), index("whatsapp_conversation_last_idx").on(t.lastAt)],
);

export const whatsappMessage = mysqlTable(
  "whatsapp_message",
  {
    id: idPk(),
    conversationId: idRef("conversation_id"),
    phoneHash: char("phone_hash", { length: 64 }).notNull(),
    phoneMasked: varchar("phone_masked", { length: 24 }).notNull(),
    dir: varchar("dir", { length: 3 }).$type<"in" | "out">().notNull(),
    /** text | buttons | list | template | image | pdf | spreadsheet | voice */
    kind: varchar("kind", { length: 16 }).notNull(),
    text: text("text"),
    /** Outbound: the WaOutbound shape (without phone). Inbound: media info. */
    payload: json("payload").$type<Record<string, unknown>>(),
    template: varchar("template", { length: 64 }),
    providerId: varchar("provider_id", { length: 96 }),
    status: varchar("status", { length: 12 }).notNull().default("sent"),
    /** Estimated cost in paise (Meta pricing is per template message). */
    costPaise: int("cost_paise").notNull().default(0),
    /** Messages that belong to a review-inbox thread. */
    inboxItemId: idRef("inbox_item_id"),
    mediaPath: varchar("media_path", { length: 300 }),
    mediaName: varchar("media_name", { length: 200 }),
    mediaMime: varchar("media_mime", { length: 80 }),
    createdAt: createdAt(),
  },
  (t) => [
    index("whatsapp_message_conv_idx").on(t.conversationId, t.createdAt),
    index("whatsapp_message_phone_idx").on(t.phoneHash, t.createdAt),
    index("whatsapp_message_inbox_idx").on(t.inboxItemId),
    index("whatsapp_message_provider_idx").on(t.providerId),
  ],
);

export type WaMetaStatus = "approved" | "pending" | "rejected" | "not_required";

export const whatsappTemplate = mysqlTable(
  "whatsapp_template",
  {
    id: idPk(),
    name: varchar("name", { length: 64 }).notNull(),
    category: varchar("category", { length: 16 }).notNull(),
    textEn: text("text_en").notNull(),
    textHi: text("text_hi"),
    metaStatus: varchar("meta_status", { length: 16 }).$type<WaMetaStatus>().notNull().default("pending"),
    ...timestamps(),
  },
  (t) => [uniqueIndex("whatsapp_template_name_uq").on(t.name)],
);

export const reminderRule = mysqlTable(
  "reminder_rule",
  {
    id: idPk(),
    key: varchar("key", { length: 32 }).notNull(),
    labelEn: varchar("label_en", { length: 120 }).notNull(),
    labelHi: varchar("label_hi", { length: 120 }),
    descriptionEn: varchar("description_en", { length: 300 }).notNull(),
    descriptionHi: varchar("description_hi", { length: 300 }),
    enabled: boolean("enabled").notNull().default(true),
    copyDistrict: boolean("copy_district").notNull().default(false),
    ...timestamps(),
  },
  (t) => [uniqueIndex("reminder_rule_key_uq").on(t.key)],
);

export const inboxItem = mysqlTable(
  "inbox_item",
  {
    id: idPk(),
    source: varchar("source", { length: 12 }).$type<Source>().notNull(),
    senderHash: char("sender_hash", { length: 64 }).notNull(),
    senderEnc: varchar("sender_enc", { length: 160 }),
    senderMasked: varchar("sender_masked", { length: 24 }).notNull(),
    conversationId: idRef("conversation_id"),
    /** Org unit (samithi) the item is scoped to; null when the sender is unknown. */
    scopeId: idRef("scope_id"),
    districtId: idRef("district_id"),
    receivedAt: datetime("received_at", { mode: "date" }).notNull(),
    state: varchar("state", { length: 12 }).$type<InboxState>().notNull().default("for_me"),
    /** approved | rejected once state = done. */
    outcome: varchar("outcome", { length: 12 }).$type<"approved" | "rejected">(),
    eventId: idRef("event_id"),
    rawKind: varchar("raw_kind", { length: 12 }).notNull(),
    rawText: text("raw_text"),
    mediaPath: varchar("media_path", { length: 300 }),
    mediaName: varchar("media_name", { length: 200 }),
    draftAnswers: json("draft_answers").$type<Record<string, unknown>>().notNull(),
    fieldConfidence: json("field_confidence").$type<Record<string, { level: Confidence; why: { en: string; hi: string | null } | null }>>().notNull(),
    confidence: varchar("confidence", { length: 8 }).$type<Confidence>().notNull(),
    aiModel: varchar("ai_model", { length: 64 }),
    aiDraftedAt: datetime("ai_drafted_at", { mode: "date" }),
    /** A question was sent to the sender and no reply has come in yet. */
    awaitingReply: boolean("awaiting_reply").notNull().default(false),
    version: int("version").notNull().default(1),
    ...timestamps(),
  },
  (t) => [index("inbox_item_state_idx").on(t.state, t.receivedAt), index("inbox_item_sender_idx").on(t.senderHash)],
);

export const inboxHistory = mysqlTable(
  "inbox_history",
  {
    id: bigint("id", { mode: "number" }).primaryKey().autoincrement(),
    itemId: idRef("item_id")
      .notNull()
      .references(() => inboxItem.id, { onDelete: "cascade" }),
    action: varchar("action", { length: 16 }).notNull(),
    byRole: varchar("by_role", { length: 24 }).$type<Role>(),
    byLabel: varchar("by_label", { length: 120 }).notNull(),
    byUserId: idRef("by_user_id"),
    note: text("note"),
    at: datetime("at", { mode: "date", fsp: 3 }).notNull(),
  },
  (t) => [index("inbox_history_item_idx").on(t.itemId, t.at)],
);

export type OptInStatus = "pending" | "opted_in" | "stopped";

/** Broadcast consent (DPDP): a number is messaged only while status = opted_in. */
export const whatsappOptin = mysqlTable(
  "whatsapp_optin",
  {
    id: idPk(),
    phoneHash: char("phone_hash", { length: 64 }).notNull(),
    phoneEnc: varchar("phone_enc", { length: 160 }).notNull(),
    phoneMasked: varchar("phone_masked", { length: 24 }).notNull(),
    districtId: idRef("district_id"),
    sevaTypes: json("seva_types").$type<SevaType[]>().notNull(),
    locale: varchar("locale", { length: 2 }).$type<Locale>().notNull().default("en"),
    status: varchar("status", { length: 10 }).$type<OptInStatus>().notNull().default("pending"),
    /** How consent was given: the public form + YES reply, or in chat. */
    via: varchar("via", { length: 12 }).notNull().default("web"),
    requestedAt: datetime("requested_at", { mode: "date" }).notNull(),
    consentAt: datetime("consent_at", { mode: "date" }),
    stoppedAt: datetime("stopped_at", { mode: "date" }),
    ipHash: varchar("ip_hash", { length: 64 }),
    ...timestamps(),
  },
  (t) => [uniqueIndex("whatsapp_optin_phone_uq").on(t.phoneHash), index("whatsapp_optin_status_idx").on(t.status, t.districtId)],
);
