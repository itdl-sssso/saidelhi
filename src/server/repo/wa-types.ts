// Storage port for the WhatsApp bot, review inbox and opt-in (M4). Implemented
// in memory (wa-mock.ts) and on MySQL (wa-db.ts).
import type { Confidence, I18nText, InboxState, Locale, Role, SevaType, Source } from "@/contract";
import type { BotStateJson, OptInStatus, WaMetaStatus } from "../db/schema/whatsapp";

export type BotState = BotStateJson;
export const EMPTY_STATE: BotState = { flow: null, step: null, data: {} };

export interface ConversationRec {
  id: string;
  phoneHash: string;
  phoneEnc: string;
  phoneMasked: string;
  locale: Locale | null;
  userId: string | null;
  state: BotState;
  expiresAt: Date | null;
  lastInboundAt: Date | null;
  lastAt: Date;
  lastText: string;
  messageCount: number;
  createdAt: Date;
}

export type MessageKind = "text" | "buttons" | "list" | "template" | "image" | "pdf" | "spreadsheet" | "voice";

export interface WaMessageRec {
  id: string;
  conversationId: string | null;
  phoneHash: string;
  phoneMasked: string;
  dir: "in" | "out";
  kind: MessageKind;
  text: string | null;
  /** Outbound: the rendered WaOutbound (phone removed). Inbound: media info. */
  payload: Record<string, unknown> | null;
  template: string | null;
  providerId: string | null;
  status: "sent" | "failed" | "received";
  costPaise: number;
  inboxItemId: string | null;
  mediaPath: string | null;
  mediaName: string | null;
  mediaMime: string | null;
  createdAt: Date;
}

export interface WaTemplateRec {
  id: string;
  name: string;
  category: "otp" | "reminder" | "approval" | "broadcast" | "link" | "general";
  textEn: string;
  textHi: string | null;
  metaStatus: WaMetaStatus;
}

export interface ReminderRuleRec {
  id: string;
  key: "day_before" | "day_after_no_report" | "plus3_no_report" | "plus7_no_report" | "approval_day2";
  label: I18nText;
  description: I18nText;
  enabled: boolean;
  copyDistrict: boolean;
}

export interface InboxItemRec {
  id: string;
  source: Source;
  senderHash: string;
  senderEnc: string | null;
  senderMasked: string;
  conversationId: string | null;
  scopeId: string | null;
  districtId: string | null;
  receivedAt: Date;
  state: InboxState;
  outcome: "approved" | "rejected" | null;
  eventId: string | null;
  rawKind: "text" | "image" | "pdf" | "spreadsheet" | "voice";
  rawText: string | null;
  mediaPath: string | null;
  mediaName: string | null;
  draftAnswers: Record<string, unknown>;
  fieldConfidence: Record<string, { level: Confidence; why: I18nText | null }>;
  confidence: Confidence;
  aiModel: string | null;
  aiDraftedAt: Date | null;
  awaitingReply: boolean;
  version: number;
  updatedAt: Date;
}

export type InboxAction = "ai_drafted" | "edited" | "matched" | "approved" | "escalated" | "rejected" | "asked" | "sender_replied";

export interface InboxHistoryRec {
  itemId: string;
  action: InboxAction;
  byRole: Role | null;
  byLabel: string;
  byUserId: string | null;
  note: string | null;
  at: Date;
}

export interface InboxFilter {
  state?: InboxState;
  /** Samithi/district unit ids the viewer can see; undefined = everything. */
  unitIds?: ReadonlySet<string>;
  limit?: number;
  offset?: number;
}

export interface InboxWrite {
  id: string;
  expectVersion: number;
  at: Date;
  patch: Partial<
    Pick<InboxItemRec, "state" | "outcome" | "eventId" | "draftAnswers" | "fieldConfidence" | "confidence" | "awaitingReply" | "scopeId" | "districtId">
  >;
  history: InboxHistoryRec[];
}

export interface OptInRec {
  id: string;
  phoneHash: string;
  phoneEnc: string;
  phoneMasked: string;
  districtId: string | null;
  sevaTypes: SevaType[];
  locale: Locale;
  status: OptInStatus;
  via: "web" | "chat";
  requestedAt: Date;
  consentAt: Date | null;
  stoppedAt: Date | null;
  ipHash: string | null;
}

export interface MessageQuery {
  conversationId?: string;
  phoneHash?: string;
  inboxItemId?: string;
  /** Newest `limit` messages, returned oldest first. */
  limit?: number;
}

export interface WaRepo {
  // Conversations
  conversationByHash(hash: string): Promise<ConversationRec | null>;
  conversationById(id: string): Promise<ConversationRec | null>;
  /** Insert or replace (by phone hash). */
  saveConversation(rec: ConversationRec): Promise<void>;
  /** Newest first. `q` matches the masked number or last text. */
  listConversations(f: { q?: string; limit: number; offset: number }): Promise<{ rows: ConversationRec[]; total: number }>;
  /** Removes the conversation and its messages (dev simulator reset). */
  deleteConversationData(hash: string): Promise<void>;

  // Messages
  insertMessage(rec: WaMessageRec): Promise<void>;
  messages(q: MessageQuery): Promise<WaMessageRec[]>;
  /** True when an inbound message with this provider id was already processed (Meta retries webhooks). */
  hasProviderMessage(providerId: string): Promise<boolean>;
  messageStats(since: Date): Promise<{ count: number; costPaise: number }>;

  // Admin config
  templates(): Promise<WaTemplateRec[]>;
  upsertTemplate(rec: WaTemplateRec): Promise<void>;
  reminderRules(): Promise<ReminderRuleRec[]>;
  upsertReminderRule(rec: ReminderRuleRec): Promise<void>;
  setReminderEnabled(id: string, enabled: boolean): Promise<ReminderRuleRec | null>;

  // Inbox
  insertInbox(rec: InboxItemRec, history: InboxHistoryRec[]): Promise<void>;
  inboxById(id: string): Promise<InboxItemRec | null>;
  listInbox(f: InboxFilter): Promise<{ rows: InboxItemRec[]; total: number }>;
  inboxCounts(f: { unitIds?: ReadonlySet<string> }): Promise<Record<InboxState, number>>;
  inboxHistory(itemId: string): Promise<InboxHistoryRec[]>;
  /** Item with a question out to this sender and no reply yet. */
  openAskFor(senderHash: string): Promise<InboxItemRec | null>;
  writeInbox(w: InboxWrite): Promise<"ok" | "conflict" | "missing">;

  // Opt-in
  optInByHash(hash: string): Promise<OptInRec | null>;
  saveOptIn(rec: OptInRec): Promise<void>;
  /** Opted-in numbers, optionally limited to districts / seva types. */
  optedIn(f: { districtIds?: readonly string[]; sevaTypes?: readonly SevaType[] }): Promise<OptInRec[]>;
  optedInCount(): Promise<number>;
}
