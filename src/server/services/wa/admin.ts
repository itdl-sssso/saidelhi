// WhatsApp admin (spec 42, contract v0.5 #5): templates, reminder rules,
// broadcasts to opted-in Sevadal (cost shown before sending), the
// conversation log and number status.
import {
  type BroadcastBody,
  type BroadcastResult,
  type ConversationDetail,
  type ConversationRow,
  type Locale,
  type Paged,
  type ReminderPatchBody,
  type ReminderRule,
  type ThreadMessage,
  type WaStatus,
  type WaTemplate,
} from "@/contract";
import { newId } from "../../db/columns";
import { auditRec } from "../../audit";
import { type Actor, assertCan, can, ROLE_LABEL } from "../../auth/rbac";
import { istDate, toIso } from "../../domain/time";
import { env } from "../../env";
import { ApiError } from "../../http/errors";
import { COST_PAISE_PER_MESSAGE } from "../../providers/whatsapp/templates";
import type { ConversationRec, ReminderRuleRec, WaMessageRec, WaTemplateRec } from "../../repo/wa-types";
import { decryptField } from "../../security/crypto";
import { maskPhone } from "../../security/phone";
import { loadReminderRules, templateRecords } from "./rules";
import type { WaCtx } from "./shared";

export const MAX_BROADCAST = 1000;

export interface WaAdminService {
  templates(actor: Actor): Promise<WaTemplate[]>;
  reminders(actor: Actor): Promise<ReminderRule[]>;
  patchReminder(actor: Actor, id: string, body: ReminderPatchBody): Promise<ReminderRule>;
  broadcast(actor: Actor, body: BroadcastBody): Promise<BroadcastResult>;
  log(actor: Actor, q: { q?: string; page: number; pageSize: number }): Promise<Paged<ConversationRow>>;
  conversation(actor: Actor, id: string): Promise<ConversationDetail>;
  status(actor: Actor): Promise<WaStatus>;
  /** Reminder rules by key (creates the defaults on first use); used by the cron job. */
  rules(): Promise<ReminderRuleRec[]>;
}

const toRule = (r: ReminderRuleRec): ReminderRule => ({ id: r.id, key: r.key, label: r.label, description: r.description, enabled: r.enabled, copyDistrict: r.copyDistrict });

function toThread(msgs: readonly WaMessageRec[]): ThreadMessage[] {
  return msgs.map((m) => ({
    id: m.id,
    dir: m.dir,
    at: toIso(m.createdAt),
    text: m.text,
    media: m.mediaName ? { kind: m.kind === "pdf" ? "pdf" : m.kind === "voice" ? "voice" : m.kind === "spreadsheet" ? "spreadsheet" : "image", url: "", name: m.mediaName } : null,
  }));
}

export function createWaAdminService(ctx: WaCtx): WaAdminService {
  const { repo, deps } = ctx;

  const requireManage = (a: Actor) => assertCan(a, "whatsapp.manage");
  const requireReminders = (a: Actor) => {
    if (!can(a, "whatsapp.manage") && !can(a, "whatsapp.reminders")) throw new ApiError("FORBIDDEN");
  };

  const ensureRules = () => loadReminderRules(repo.wa);

  async function ensureTemplates(): Promise<WaTemplateRec[]> {
    const existing = await repo.wa.templates();
    const have = new Set(existing.map((t) => t.name));
    const missing = templateRecords().filter((t) => !have.has(t.name));
    for (const t of missing) await repo.wa.upsertTemplate(t);
    return missing.length === 0 ? existing : repo.wa.templates();
  }

  async function who(c: ConversationRec): Promise<ConversationRow["who"]> {
    if (!c.userId) return { role: null, label: "Public" };
    const [user, role] = await Promise.all([repo.portal.userById(c.userId), repo.portal.currentRole(c.userId)]);
    return user ? { role: role?.role ?? null, label: role ? `${user.name} (${ROLE_LABEL[role.role].en})` : user.name } : { role: null, label: "Public" };
  }

  async function row(c: ConversationRec): Promise<ConversationRow> {
    return { id: c.id, phone: c.phoneMasked, who: await who(c), lastAt: toIso(c.lastAt), lastText: c.lastText, messages: c.messageCount, locale: c.locale ?? "en" };
  }

  return {
    async rules() {
      return ensureRules();
    },

    async templates(actor) {
      requireManage(actor);
      return (await ensureTemplates()).map((t) => ({ id: t.id, name: t.name, category: t.category, text: { en: t.textEn, hi: t.textHi }, metaStatus: t.metaStatus }));
    },

    async reminders(actor) {
      requireReminders(actor);
      return (await ensureRules()).map(toRule);
    },

    async patchReminder(actor, id, body) {
      requireReminders(actor);
      await ensureRules();
      const rec = await repo.wa.setReminderEnabled(id, body.enabled);
      if (!rec) throw new ApiError("NOT_FOUND");
      await repo.portal.insertAudit(auditRec(actor, { action: "whatsapp.reminder_toggle", entity: "reminder_rule", entityId: id, scopeId: actor.scopeId, data: { key: rec.key, enabled: body.enabled } }));
      return toRule(rec);
    },

    async broadcast(actor, body) {
      requireManage(actor);
      const recipients = await repo.wa.optedIn({ districtIds: body.districtIds, sevaTypes: body.sevaTypes });
      const estimatedCostInr = Math.round(recipients.length * COST_PAISE_PER_MESSAGE.marketing) / 100;
      if (body.dryRun) return { recipients: recipients.length, estimatedCostInr, sent: false, broadcastId: null };
      if (recipients.length > MAX_BROADCAST) throw new ApiError("VALIDATION_FAILED", { fields: { districtIds: `Too many recipients (${recipients.length}). Narrow by district or seva type; the limit is ${MAX_BROADCAST}.` } });
      const broadcastId = newId();
      let delivered = 0;
      for (const r of recipients) {
        const phone = decryptField(deps.secret, r.phoneEnc);
        if (!phone) continue;
        const l: Locale = r.locale;
        const text = l === "hi" && body.text.hi ? body.text.hi : body.text.en;
        try {
          await deps.whatsapp.sendTemplate(phone, "seva_broadcast", l, [l === "hi" ? "सेवा अपडेट" : "Seva update", text]);
          delivered++;
        } catch (err) {
          console.error("[broadcast] send failed", err instanceof Error ? err.message : err);
        }
      }
      await repo.portal.insertAudit(
        auditRec(actor, { action: "whatsapp.broadcast", entity: "broadcast", entityId: broadcastId, scopeId: actor.scopeId, data: { recipients: recipients.length, delivered, districts: body.districtIds.length, sevaTypes: body.sevaTypes } }),
      );
      return { recipients: recipients.length, estimatedCostInr, sent: true, broadcastId };
    },

    async log(actor, q) {
      requireManage(actor);
      const { rows, total } = await repo.wa.listConversations({ q: q.q, limit: q.pageSize, offset: (q.page - 1) * q.pageSize });
      return { data: await Promise.all(rows.map(row)), meta: { page: q.page, pageSize: q.pageSize, total } };
    },

    async conversation(actor, id) {
      requireManage(actor);
      const conv = await repo.wa.conversationById(id);
      if (!conv) throw new ApiError("NOT_FOUND");
      const msgs = await repo.wa.messages({ conversationId: id, limit: 500 });
      await repo.portal.insertAudit(auditRec(actor, { action: "whatsapp.view_thread", entity: "whatsapp_conversation", entityId: id, scopeId: actor.scopeId, data: { messages: msgs.length } }));
      return { ...(await row(conv)), thread: toThread(msgs) };
    },

    async status(actor) {
      requireManage(actor);
      const e = env();
      const monthStart = new Date(`${istDate(deps.now()).slice(0, 7)}-01T00:00:00+05:30`);
      const [stats, optedIn] = await Promise.all([repo.wa.messageStats(monthStart), repo.wa.optedInCount()]);
      return {
        provider: deps.whatsapp.name,
        number: e.WA_DISPLAY_NUMBER ? maskPhone(e.WA_DISPLAY_NUMBER) : null,
        coexistence: e.WA_COEXISTENCE,
        monthMessages: stats.count,
        monthCostInr: Math.round(stats.costPaise) / 100,
        optedIn,
      };
    },
  };
}
