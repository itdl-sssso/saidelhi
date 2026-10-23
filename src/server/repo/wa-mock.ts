import type { InboxState, SevaType } from "@/contract";
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

/** True when the unit filter lets the item through (scope or district match). */
export function inboxVisible(i: InboxItemRec, unitIds: ReadonlySet<string> | undefined): boolean {
  if (!unitIds) return true;
  return (!!i.scopeId && unitIds.has(i.scopeId)) || (!!i.districtId && unitIds.has(i.districtId));
}

export function optInMatches(o: OptInRec, f: { districtIds?: readonly string[]; sevaTypes?: readonly SevaType[] }): boolean {
  const districtOk = !f.districtIds?.length || !o.districtId || f.districtIds.includes(o.districtId);
  const sevaOk = !f.sevaTypes?.length || o.sevaTypes.length === 0 || o.sevaTypes.some((s) => f.sevaTypes?.includes(s));
  return districtOk && sevaOk;
}

/** In-memory implementation (DATA_SOURCE=mock and unit tests). */
export class MemoryWaRepo implements WaRepo {
  constructor(seed?: {
    templates: WaTemplateRec[];
    rules: ReminderRuleRec[];
    conversations: ConversationRec[];
    messages: WaMessageRec[];
    inbox: InboxItemRec[];
    history: InboxHistoryRec[];
    optIns: OptInRec[];
  }) {
    if (!seed) return;
    const s = structuredClone(seed);
    for (const t of s.templates) this.tpl.set(t.name, t);
    for (const r of s.rules) this.rules.set(r.key, r);
    for (const c of s.conversations) this.conversations.set(c.phoneHash, c);
    this.msgs.push(...s.messages);
    for (const i of s.inbox) this.inbox.set(i.id, i);
    this.history.push(...s.history);
    for (const o of s.optIns) this.optins.set(o.phoneHash, o);
  }

  private readonly conversations = new Map<string, ConversationRec>();
  private readonly msgs: WaMessageRec[] = [];
  private readonly tpl = new Map<string, WaTemplateRec>();
  private readonly rules = new Map<string, ReminderRuleRec>();
  private readonly inbox = new Map<string, InboxItemRec>();
  private readonly history: InboxHistoryRec[] = [];
  private readonly optins = new Map<string, OptInRec>();

  async conversationByHash(hash: string) {
    const c = this.conversations.get(hash);
    return c ? structuredClone(c) : null;
  }

  async conversationById(id: string) {
    const c = [...this.conversations.values()].find((x) => x.id === id);
    return c ? structuredClone(c) : null;
  }

  async saveConversation(rec: ConversationRec) {
    this.conversations.set(rec.phoneHash, structuredClone(rec));
  }

  async listConversations(f: { q?: string; limit: number; offset: number }) {
    const q = f.q?.trim().toLowerCase();
    const all = [...this.conversations.values()]
      .filter((c) => !q || c.phoneMasked.toLowerCase().includes(q) || c.lastText.toLowerCase().includes(q))
      .sort((a, b) => b.lastAt.getTime() - a.lastAt.getTime());
    return { rows: structuredClone(all.slice(f.offset, f.offset + f.limit)), total: all.length };
  }

  async deleteConversationData(hash: string) {
    this.conversations.delete(hash);
    for (let i = this.msgs.length - 1; i >= 0; i--) if (this.msgs[i].phoneHash === hash) this.msgs.splice(i, 1);
  }

  async insertMessage(rec: WaMessageRec) {
    this.msgs.push(structuredClone(rec));
  }

  async messages(q: MessageQuery) {
    const rows = this.msgs
      .filter((m) => (!q.conversationId || m.conversationId === q.conversationId) && (!q.phoneHash || m.phoneHash === q.phoneHash) && (!q.inboxItemId || m.inboxItemId === q.inboxItemId))
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    return q.limit ? rows.slice(-q.limit) : rows;
  }

  async hasProviderMessage(providerId: string) {
    return this.msgs.some((m) => m.dir === "in" && m.providerId === providerId);
  }

  async messageStats(since: Date) {
    const rows = this.msgs.filter((m) => m.dir === "out" && m.createdAt >= since);
    return { count: rows.length, costPaise: rows.reduce((n, m) => n + m.costPaise, 0) };
  }

  async templates() {
    return [...this.tpl.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  async upsertTemplate(rec: WaTemplateRec) {
    this.tpl.set(rec.name, { ...rec });
  }

  async reminderRules() {
    return [...this.rules.values()];
  }

  async upsertReminderRule(rec: ReminderRuleRec) {
    this.rules.set(rec.key, structuredClone(rec));
  }

  async setReminderEnabled(id: string, enabled: boolean) {
    const r = [...this.rules.values()].find((x) => x.id === id);
    if (!r) return null;
    r.enabled = enabled;
    return structuredClone(r);
  }

  async insertInbox(rec: InboxItemRec, history: InboxHistoryRec[]) {
    this.inbox.set(rec.id, structuredClone(rec));
    this.history.push(...structuredClone(history));
  }

  async inboxById(id: string) {
    const i = this.inbox.get(id);
    return i ? structuredClone(i) : null;
  }

  async listInbox(f: InboxFilter) {
    const rows = [...this.inbox.values()]
      .filter((i) => (!f.state || i.state === f.state) && inboxVisible(i, f.unitIds))
      .sort((a, b) => a.receivedAt.getTime() - b.receivedAt.getTime() || a.id.localeCompare(b.id));
    const off = f.offset ?? 0;
    return { rows: structuredClone(rows.slice(off, f.limit ? off + f.limit : undefined)), total: rows.length };
  }

  async inboxCounts(f: { unitIds?: ReadonlySet<string> }) {
    const out: Record<InboxState, number> = { for_me: 0, escalated: 0, done: 0 };
    for (const i of this.inbox.values()) if (inboxVisible(i, f.unitIds)) out[i.state]++;
    return out;
  }

  async inboxHistory(itemId: string) {
    return structuredClone(this.history.filter((h) => h.itemId === itemId).sort((a, b) => a.at.getTime() - b.at.getTime()));
  }

  async openAskFor(senderHash: string) {
    const i = [...this.inbox.values()].filter((x) => x.senderHash === senderHash && x.awaitingReply).sort((a, b) => b.receivedAt.getTime() - a.receivedAt.getTime())[0];
    return i ? structuredClone(i) : null;
  }

  async writeInbox(w: InboxWrite) {
    const i = this.inbox.get(w.id);
    if (!i) return "missing" as const;
    if (i.version !== w.expectVersion) return "conflict" as const;
    Object.assign(i, structuredClone(w.patch), { version: i.version + 1, updatedAt: w.at });
    this.history.push(...structuredClone(w.history));
    return "ok" as const;
  }

  async optInByHash(hash: string) {
    return this.optins.get(hash) ?? null;
  }

  async saveOptIn(rec: OptInRec) {
    this.optins.set(rec.phoneHash, structuredClone(rec));
  }

  async optedIn(f: { districtIds?: readonly string[]; sevaTypes?: readonly SevaType[] }) {
    return [...this.optins.values()].filter((o) => o.status === "opted_in" && optInMatches(o, f));
  }

  async optedInCount() {
    return [...this.optins.values()].filter((o) => o.status === "opted_in").length;
  }
}
