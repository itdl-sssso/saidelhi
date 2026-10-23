import "server-only";
import { and, asc, desc, eq, gte, inArray, isNotNull, like, or, type SQL, sql } from "drizzle-orm";
import type { InboxState, SevaType } from "@/contract";
import type { Db } from "../db/client";
import { inboxHistory, inboxItem, reminderRule, whatsappConversation, whatsappMessage, whatsappOptin, whatsappTemplate } from "../db/tables";
import { affected } from "./links-db";
import { optInMatches } from "./wa-mock";
import type {
  ConversationRec,
  InboxFilter,
  InboxHistoryRec,
  InboxItemRec,
  InboxWrite,
  MessageQuery,
  OptInRec,
  ReminderRuleRec,
  WaMessageRec,
  WaRepo,
  WaTemplateRec,
} from "./wa-types";

type ConvRow = typeof whatsappConversation.$inferSelect;
type MsgRow = typeof whatsappMessage.$inferSelect;
type InboxRow = typeof inboxItem.$inferSelect;
type OptRow = typeof whatsappOptin.$inferSelect;
type RuleRow = typeof reminderRule.$inferSelect;
type TplRow = typeof whatsappTemplate.$inferSelect;

const toConv = (r: ConvRow): ConversationRec => ({
  id: r.id,
  phoneHash: r.phoneHash,
  phoneEnc: r.phoneEnc,
  phoneMasked: r.phoneMasked,
  locale: r.locale,
  userId: r.userId,
  state: r.state,
  expiresAt: r.expiresAt,
  lastInboundAt: r.lastInboundAt,
  lastAt: r.lastAt,
  lastText: r.lastText,
  messageCount: r.messageCount,
  createdAt: r.createdAt,
});

const toMsg = (r: MsgRow): WaMessageRec => ({
  id: r.id,
  conversationId: r.conversationId,
  phoneHash: r.phoneHash,
  phoneMasked: r.phoneMasked,
  dir: r.dir,
  kind: r.kind as WaMessageRec["kind"],
  text: r.text,
  payload: r.payload,
  template: r.template,
  providerId: r.providerId,
  status: r.status as WaMessageRec["status"],
  costPaise: r.costPaise,
  inboxItemId: r.inboxItemId,
  mediaPath: r.mediaPath,
  mediaName: r.mediaName,
  mediaMime: r.mediaMime,
  createdAt: r.createdAt,
});

const toInbox = (r: InboxRow): InboxItemRec => ({
  id: r.id,
  source: r.source,
  senderHash: r.senderHash,
  senderEnc: r.senderEnc,
  senderMasked: r.senderMasked,
  conversationId: r.conversationId,
  scopeId: r.scopeId,
  districtId: r.districtId,
  receivedAt: r.receivedAt,
  state: r.state,
  outcome: r.outcome,
  eventId: r.eventId,
  rawKind: r.rawKind as InboxItemRec["rawKind"],
  rawText: r.rawText,
  mediaPath: r.mediaPath,
  mediaName: r.mediaName,
  draftAnswers: r.draftAnswers,
  fieldConfidence: r.fieldConfidence,
  confidence: r.confidence,
  aiModel: r.aiModel,
  aiDraftedAt: r.aiDraftedAt,
  awaitingReply: r.awaitingReply,
  version: r.version,
  updatedAt: r.updatedAt,
});

const toOpt = (r: OptRow): OptInRec => ({
  id: r.id,
  phoneHash: r.phoneHash,
  phoneEnc: r.phoneEnc,
  phoneMasked: r.phoneMasked,
  districtId: r.districtId,
  sevaTypes: r.sevaTypes,
  locale: r.locale,
  status: r.status,
  via: r.via as OptInRec["via"],
  requestedAt: r.requestedAt,
  consentAt: r.consentAt,
  stoppedAt: r.stoppedAt,
  ipHash: r.ipHash,
});

const toRule = (r: RuleRow): ReminderRuleRec => ({
  id: r.id,
  key: r.key as ReminderRuleRec["key"],
  label: { en: r.labelEn, hi: r.labelHi },
  description: { en: r.descriptionEn, hi: r.descriptionHi },
  enabled: r.enabled,
  copyDistrict: r.copyDistrict,
});

const toTpl = (r: TplRow): WaTemplateRec => ({
  id: r.id,
  name: r.name,
  category: r.category as WaTemplateRec["category"],
  textEn: r.textEn,
  textHi: r.textHi,
  metaStatus: r.metaStatus,
});

function omit<T extends object, K extends keyof T>(o: T, ...keys: K[]): Omit<T, K> {
  const copy = { ...o };
  for (const k of keys) delete copy[k];
  return copy;
}

const escapeLike = (s: string) => s.replace(/[\\%_]/g, (m) => `\\${m}`);

export class DbWaRepo implements WaRepo {
  constructor(private readonly db: Db) {}

  async conversationByHash(hash: string) {
    const [r] = await this.db.select().from(whatsappConversation).where(eq(whatsappConversation.phoneHash, hash)).limit(1);
    return r ? toConv(r) : null;
  }

  async conversationById(id: string) {
    const [r] = await this.db.select().from(whatsappConversation).where(eq(whatsappConversation.id, id)).limit(1);
    return r ? toConv(r) : null;
  }

  async saveConversation(rec: ConversationRec) {
    const rest = omit(rec, "id", "createdAt");
    await this.db
      .insert(whatsappConversation)
      .values({ ...rec })
      .onDuplicateKeyUpdate({ set: rest });
  }

  async listConversations(f: { q?: string; limit: number; offset: number }) {
    const q = f.q?.trim();
    const where: SQL | undefined = q
      ? or(like(whatsappConversation.phoneMasked, `%${escapeLike(q)}%`), like(whatsappConversation.lastText, `%${escapeLike(q)}%`))
      : undefined;
    const [rows, [total]] = await Promise.all([
      this.db.select().from(whatsappConversation).where(where).orderBy(desc(whatsappConversation.lastAt)).limit(f.limit).offset(f.offset),
      this.db.select({ n: sql<number>`count(*)` }).from(whatsappConversation).where(where),
    ]);
    return { rows: rows.map(toConv), total: Number(total?.n ?? 0) };
  }

  async deleteConversationData(hash: string) {
    await this.db.delete(whatsappMessage).where(eq(whatsappMessage.phoneHash, hash));
    await this.db.delete(whatsappConversation).where(eq(whatsappConversation.phoneHash, hash));
  }

  async insertMessage(rec: WaMessageRec) {
    await this.db.insert(whatsappMessage).values({ ...rec });
  }

  async messages(q: MessageQuery) {
    const conds: SQL[] = [];
    if (q.conversationId) conds.push(eq(whatsappMessage.conversationId, q.conversationId));
    if (q.phoneHash) conds.push(eq(whatsappMessage.phoneHash, q.phoneHash));
    if (q.inboxItemId) conds.push(eq(whatsappMessage.inboxItemId, q.inboxItemId));
    const base = this.db.select().from(whatsappMessage).where(and(...conds));
    if (q.limit) {
      const rows = await base.orderBy(desc(whatsappMessage.createdAt), desc(whatsappMessage.id)).limit(q.limit);
      return rows.reverse().map(toMsg);
    }
    return (await base.orderBy(asc(whatsappMessage.createdAt), asc(whatsappMessage.id))).map(toMsg);
  }

  async hasProviderMessage(providerId: string) {
    const [r] = await this.db
      .select({ id: whatsappMessage.id })
      .from(whatsappMessage)
      .where(and(eq(whatsappMessage.dir, "in"), eq(whatsappMessage.providerId, providerId)))
      .limit(1);
    return !!r;
  }

  async messageStats(since: Date) {
    const [r] = await this.db
      .select({ n: sql<number>`count(*)`, c: sql<number>`coalesce(sum(${whatsappMessage.costPaise}), 0)` })
      .from(whatsappMessage)
      .where(and(eq(whatsappMessage.dir, "out"), gte(whatsappMessage.createdAt, since)));
    return { count: Number(r?.n ?? 0), costPaise: Number(r?.c ?? 0) };
  }

  async templates() {
    return (await this.db.select().from(whatsappTemplate).orderBy(asc(whatsappTemplate.name))).map(toTpl);
  }

  async upsertTemplate(rec: WaTemplateRec) {
    const rest = omit(rec, "id");
    await this.db
      .insert(whatsappTemplate)
      .values({ ...rec })
      .onDuplicateKeyUpdate({ set: rest });
  }

  async reminderRules() {
    return (await this.db.select().from(reminderRule).orderBy(asc(reminderRule.createdAt), asc(reminderRule.key))).map(toRule);
  }

  async upsertReminderRule(rec: ReminderRuleRec) {
    const row = {
      id: rec.id,
      key: rec.key,
      labelEn: rec.label.en,
      labelHi: rec.label.hi,
      descriptionEn: rec.description.en,
      descriptionHi: rec.description.hi,
      enabled: rec.enabled,
      copyDistrict: rec.copyDistrict,
    };
    const rest = omit(row, "id");
    await this.db.insert(reminderRule).values(row).onDuplicateKeyUpdate({ set: rest });
  }

  async setReminderEnabled(id: string, enabled: boolean) {
    await this.db.update(reminderRule).set({ enabled }).where(eq(reminderRule.id, id));
    const [r] = await this.db.select().from(reminderRule).where(eq(reminderRule.id, id)).limit(1);
    return r ? toRule(r) : null;
  }

  async insertInbox(rec: InboxItemRec, history: InboxHistoryRec[]) {
    const row = omit(rec, "updatedAt");
    await this.db.transaction(async (tx) => {
      await tx.insert(inboxItem).values(row);
      if (history.length) await tx.insert(inboxHistory).values(history);
    });
  }

  async inboxById(id: string) {
    const [r] = await this.db.select().from(inboxItem).where(eq(inboxItem.id, id)).limit(1);
    return r ? toInbox(r) : null;
  }

  private unitCond(unitIds: ReadonlySet<string> | undefined): SQL | undefined {
    if (!unitIds) return undefined;
    const ids = [...unitIds];
    if (ids.length === 0) return sql`1 = 0`;
    return or(inArray(inboxItem.scopeId, ids), inArray(inboxItem.districtId, ids));
  }

  async listInbox(f: InboxFilter) {
    const where = and(f.state ? eq(inboxItem.state, f.state) : undefined, this.unitCond(f.unitIds));
    const q = this.db.select().from(inboxItem).where(where).orderBy(asc(inboxItem.receivedAt), asc(inboxItem.id));
    const [rows, [total]] = await Promise.all([
      f.limit ? q.limit(f.limit).offset(f.offset ?? 0) : q,
      this.db.select({ n: sql<number>`count(*)` }).from(inboxItem).where(where),
    ]);
    return { rows: rows.map(toInbox), total: Number(total?.n ?? 0) };
  }

  async inboxCounts(f: { unitIds?: ReadonlySet<string> }) {
    const rows = await this.db
      .select({ state: inboxItem.state, n: sql<number>`count(*)` })
      .from(inboxItem)
      .where(this.unitCond(f.unitIds))
      .groupBy(inboxItem.state);
    const out: Record<InboxState, number> = { for_me: 0, escalated: 0, done: 0 };
    for (const r of rows) out[r.state] = Number(r.n);
    return out;
  }

  async inboxHistory(itemId: string) {
    const rows = await this.db.select().from(inboxHistory).where(eq(inboxHistory.itemId, itemId)).orderBy(asc(inboxHistory.at), asc(inboxHistory.id));
    return rows.map((r): InboxHistoryRec => ({
      itemId: r.itemId,
      action: r.action as InboxHistoryRec["action"],
      byRole: r.byRole,
      byLabel: r.byLabel,
      byUserId: r.byUserId,
      note: r.note,
      at: r.at,
    }));
  }

  async openAskFor(senderHash: string) {
    const [r] = await this.db
      .select()
      .from(inboxItem)
      .where(and(eq(inboxItem.senderHash, senderHash), eq(inboxItem.awaitingReply, true)))
      .orderBy(desc(inboxItem.receivedAt))
      .limit(1);
    return r ? toInbox(r) : null;
  }

  async writeInbox(w: InboxWrite) {
    return this.db.transaction(async (tx) => {
      const res = await tx
        .update(inboxItem)
        .set({ ...w.patch, version: sql`${inboxItem.version} + 1` })
        .where(and(eq(inboxItem.id, w.id), eq(inboxItem.version, w.expectVersion)));
      if (affected(res) === 0) {
        const [exists] = await tx.select({ id: inboxItem.id }).from(inboxItem).where(eq(inboxItem.id, w.id)).limit(1);
        return exists ? ("conflict" as const) : ("missing" as const);
      }
      if (w.history.length) await tx.insert(inboxHistory).values(w.history);
      return "ok" as const;
    });
  }

  async optInByHash(hash: string) {
    const [r] = await this.db.select().from(whatsappOptin).where(eq(whatsappOptin.phoneHash, hash)).limit(1);
    return r ? toOpt(r) : null;
  }

  async saveOptIn(rec: OptInRec) {
    const rest = omit(rec, "id");
    await this.db
      .insert(whatsappOptin)
      .values({ ...rec })
      .onDuplicateKeyUpdate({ set: rest });
  }

  async optedIn(f: { districtIds?: readonly string[]; sevaTypes?: readonly SevaType[] }) {
    const rows = await this.db.select().from(whatsappOptin).where(and(eq(whatsappOptin.status, "opted_in"), isNotNull(whatsappOptin.phoneEnc)));
    // JSON seva-type filtering is done here: the list is small (one row per volunteer).
    return rows.map(toOpt).filter((o) => optInMatches(o, f));
  }

  async optedInCount() {
    const [r] = await this.db.select({ n: sql<number>`count(*)` }).from(whatsappOptin).where(eq(whatsappOptin.status, "opted_in"));
    return Number(r?.n ?? 0);
  }
}

