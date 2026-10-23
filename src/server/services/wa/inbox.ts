// Review inbox (spec 28, contract v0.5 #4): chat messages and photos become AI
// drafts that a person approves, fixes, escalates or rejects. Nothing counts
// until approved; every action is audited and names who did it.
import {
  type Confidence,
  type FormDefinition,
  type I18nText,
  type InboxAskBody,
  type InboxApproveBody,
  type InboxDetail,
  type InboxEscalateBody,
  type InboxHistoryEntry,
  type InboxPatchBody,
  type InboxQuery,
  type InboxRejectBody,
  type InboxRow,
  type InboxListMeta,
  type Source,
  type ThreadMessage,
} from "@/contract";
import { newId } from "../../db/columns";
import { eventHints } from "../../ai/rules";
import type { ExtractField, ExtractResult } from "../../ai/types";
import { auditRec } from "../../audit";
import { type Actor, assertCan } from "../../auth/rbac";
import { addDays, istDate, istDayStart, toIso } from "../../domain/time";
import { ApiError } from "../../http/errors";
import { sniffMime } from "../../files";
import type { EventRec } from "../../repo/types";
import type { InboxFilter, InboxHistoryRec, InboxItemRec, WaMessageRec } from "../../repo/wa-types";
import { chatQuestions } from "../../whatsapp/questions";
import type { BotMedia } from "../../whatsapp/bot/types";
import type { ConversationRec } from "../../repo/wa-types";
import { loadOrg } from "../shared";
import { i18n } from "../org-index";
import { overallConfidence, messageSender, type WaCtx } from "./shared";

const DAY_MS = 24 * 60 * 60 * 1000;

export interface IngestInput {
  conversation: ConversationRec;
  actor: Actor | null;
  text: string | null;
  media: BotMedia | null;
  /** "human_handoff" or "reply:<itemId>". */
  note?: string;
}

export interface InboxService {
  list(actor: Actor, q: InboxQuery): Promise<{ data: InboxRow[]; meta: InboxListMeta }>;
  get(actor: Actor, id: string): Promise<InboxDetail>;
  patch(actor: Actor, id: string, body: InboxPatchBody): Promise<InboxDetail>;
  approve(actor: Actor, id: string, body: InboxApproveBody): Promise<InboxDetail>;
  escalate(actor: Actor, id: string, body: InboxEscalateBody): Promise<InboxDetail>;
  reject(actor: Actor, id: string, body: InboxRejectBody): Promise<InboxDetail>;
  ask(actor: Actor, id: string, body: InboxAskBody): Promise<InboxDetail>;
  /** Authorises and audits a media view; the route streams the file. */
  openMedia(actor: Actor, id: string, messageId: string | null): Promise<{ path: string; mime: string; name: string }>;
  /** From the bot: a coordinator's free text / photo, a hand-off, or a reply to a question. */
  ingest(i: IngestInput): Promise<InboxItemRec>;
}

const ageDays = (at: Date, now: Date) => Math.max(0, Math.floor((now.getTime() - at.getTime()) / DAY_MS));

const MSG_KIND: Record<string, "image" | "pdf" | "spreadsheet" | "voice"> = {
  image: "image",
  pdf: "pdf",
  spreadsheet: "spreadsheet",
  voice: "voice",
};

export function createInboxService(ctx: WaCtx): InboxService {
  const { repo, deps } = ctx;
  const now = () => deps.now();

  const unitFilter = (a: Actor): ReadonlySet<string> | undefined => (a.all ? undefined : a.unitIds);

  /** Items outside the actor's scope do not exist for them. */
  async function load(actor: Actor, id: string): Promise<InboxItemRec> {
    assertCan(actor, "inbox.review");
    const item = await repo.wa.inboxById(id);
    if (!item) throw new ApiError("NOT_FOUND");
    if (!actor.all && !((item.scopeId && actor.unitIds.has(item.scopeId)) || (item.districtId && actor.unitIds.has(item.districtId)))) throw new ApiError("NOT_FOUND");
    return item;
  }

  /** What the viewer may do now: districts review first, state takes escalated and hard items. */
  function canFor(actor: Actor, item: InboxItemRec): InboxDetail["can"] {
    const reviewer = actor.role === "district_coord" || actor.role === "state_admin";
    const open = reviewer && item.state !== "done" && (actor.role === "state_admin" || item.state === "for_me");
    return { approve: open, edit: open, reject: open, ask: open, escalate: actor.role === "district_coord" && item.state === "for_me" };
  }

  function requireCan(actor: Actor, item: InboxItemRec, action: keyof InboxDetail["can"]) {
    if (!canFor(actor, item)[action]) throw new ApiError("FORBIDDEN");
  }

  async function eventTitle(id: string | null): Promise<{ id: string; title: I18nText; startsAt: string } | null> {
    const ev = id ? await repo.eventById(id) : null;
    return ev ? { id: ev.id, title: i18n(ev.titleEn, ev.titleHi), startsAt: toIso(ev.startsAt) } : null;
  }

  async function definitionOf(eventId: string | null): Promise<{ def: FormDefinition; prefill: Record<string, unknown> } | null> {
    if (!eventId) return null;
    try {
      const c = await ctx.links.reportContext(eventId, "en");
      return { def: c.definition, prefill: c.prefill };
    } catch {
      return null;
    }
  }

  const fieldsOf = (def: FormDefinition): ExtractField[] =>
    chatQuestions(def, {}).map((f) => ({ id: f.id, label: f.label, min: f.min, max: f.max, required: f.required, kpi: f.kpi }));

  /** Candidates: reportable events in the item's scope close to when it arrived. */
  async function candidatesFor(item: Pick<InboxItemRec, "scopeId" | "districtId" | "receivedAt">, actor: Actor | null): Promise<EventRec[]> {
    const org = await loadOrg(repo);
    let samithiIds: string[] | undefined;
    if (item.scopeId) samithiIds = [item.scopeId];
    else if (item.districtId) samithiIds = org.samithisOf(item.districtId).map((s) => s.id);
    else if (actor && !actor.all) samithiIds = [...actor.unitIds].filter((u) => org.get(u)?.kind === "samithi");
    const day = istDate(item.receivedAt);
    const { rows } = await repo.portal.listAdminEvents({
      samithiIds,
      statuses: ["planned", "awaiting_report"],
      from: istDayStart(addDays(day, -14)),
      to: istDayStart(addDays(day, 15)),
      sort: "-startsAt",
      limit: 30,
      offset: 0,
    });
    return rows;
  }

  function matchEvent(events: readonly EventRec[], text: string | null, at: Date): { ev: EventRec; level: Confidence; why: string } | null {
    if (events.length === 0) return null;
    const hints = text ? eventHints(text, at, "past") : { date: null, sevaType: null };
    let best: { ev: EventRec; score: number; why: string[] } | null = null;
    let tied = false;
    for (const ev of events) {
      let score = 0;
      const why: string[] = [];
      if (hints.date && istDate(ev.startsAt) === hints.date.date) {
        score += 3;
        why.push(hints.date.why);
      }
      if (hints.sevaType && hints.sevaType === ev.sevaType) {
        score += 2;
        why.push(`Message mentions ${ev.sevaType.replace("_", " ")}`);
      }
      if (!hints.date && ev.startsAt <= at && at.getTime() - ev.startsAt.getTime() < 7 * DAY_MS) {
        score += 1;
        why.push("Most recent activity of the samithi");
      }
      if (score === 0) continue;
      if (!best || score > best.score) {
        best = { ev, score, why };
        tied = false;
      } else if (score === best.score) tied = true;
    }
    if (!best) return null;
    const level: Confidence = best.score >= 5 && !tied ? "high" : best.score >= 2 && !tied ? "check" : "low";
    return { ev: best.ev, level, why: best.why.join("; ") };
  }

  async function extract(text: string | null, def: FormDefinition | null): Promise<ExtractResult | null> {
    if (!text || !def) return null;
    return ctx.extractor.extractFields({ text, now: now(), fields: fieldsOf(def) });
  }

  async function sealedSender(item: InboxItemRec): Promise<string | null> {
    return item.senderEnc;
  }

  function toRow(item: InboxItemRec, ev: { id: string; title: I18nText } | null): InboxRow {
    return {
      id: item.id,
      source: item.source,
      sender: item.senderMasked,
      receivedAt: toIso(item.receivedAt),
      matchedEvent: ev,
      confidence: item.confidence,
      ageDays: ageDays(item.receivedAt, now()),
      state: item.state,
      preview: (item.rawText ?? item.mediaName ?? "").replace(/\s+/g, " ").slice(0, 120),
    };
  }

  function toThread(item: InboxItemRec, msgs: readonly WaMessageRec[]): ThreadMessage[] {
    return msgs.map((m) => ({
      id: m.id,
      dir: m.dir,
      at: toIso(m.createdAt),
      text: m.text,
      media: m.mediaName ? { kind: MSG_KIND[m.kind] ?? "image", url: `/api/v1/admin/inbox/${item.id}/media?m=${m.id}`, name: m.mediaName } : null,
    }));
  }

  async function detail(actor: Actor, item: InboxItemRec): Promise<InboxDetail> {
    const [matched, def, cands, history, msgs] = await Promise.all([
      eventTitle(item.eventId),
      definitionOf(item.eventId),
      candidatesFor(item, actor),
      repo.wa.inboxHistory(item.id),
      item.source === "whatsapp" ? repo.wa.messages({ inboxItemId: item.id }) : Promise.resolve([] as WaMessageRec[]),
    ]);
    const h: InboxHistoryEntry[] = history.map((x) => ({ action: x.action, by: { role: x.byRole, label: x.byLabel }, at: toIso(x.at), note: x.note }));
    return {
      id: item.id,
      source: item.source,
      sender: item.senderMasked,
      receivedAt: toIso(item.receivedAt),
      state: item.state,
      confidence: item.confidence,
      ageDays: ageDays(item.receivedAt, now()),
      raw: { kind: item.rawKind, text: item.rawText, mediaUrl: item.mediaPath ? `/api/v1/admin/inbox/${item.id}/media` : null },
      thread: toThread(item, msgs),
      matchedEvent: matched,
      candidates: await Promise.all(
        cands.map(async (e) => ({ id: e.id, title: i18n(e.titleEn, e.titleHi), startsAt: toIso(e.startsAt) })),
      ),
      definition: def?.def ?? null,
      draft: { answers: { ...(def?.prefill ?? {}), ...item.draftAnswers }, fieldConfidence: item.fieldConfidence },
      aiDraftedAt: item.aiDraftedAt ? toIso(item.aiDraftedAt) : null,
      aiModel: item.aiModel,
      history: h,
      can: canFor(actor, item),
      version: item.version,
    };
  }

  async function write(actor: Actor, item: InboxItemRec, version: number, patch: Parameters<typeof repo.wa.writeInbox>[0]["patch"], hist: Omit<InboxHistoryRec, "itemId" | "at" | "byRole" | "byLabel" | "byUserId">, audit: string) {
    if (item.version !== version) throw new ApiError("CONFLICT");
    const at = now();
    const res = await repo.wa.writeInbox({
      id: item.id,
      expectVersion: version,
      at,
      patch,
      history: [{ itemId: item.id, at, byRole: actor.role, byLabel: actor.name, byUserId: actor.userId, ...hist }],
    });
    if (res === "conflict") throw new ApiError("CONFLICT");
    if (res === "missing") throw new ApiError("NOT_FOUND");
    await repo.portal.insertAudit(
      auditRec(actor, { action: audit, entity: "inbox_item", entityId: item.id, scopeId: item.scopeId ?? item.districtId, data: { action: hist.action, ...(hist.note ? { note: hist.note } : {}) } }),
    );
    return (await repo.wa.inboxById(item.id)) as InboxItemRec;
  }

  const service: InboxService = {
    async list(actor, q) {
      assertCan(actor, "inbox.review");
      const unitIds = unitFilter(actor);
      const f: InboxFilter = { state: q.tab, unitIds, limit: q.pageSize, offset: (q.page - 1) * q.pageSize };
      const [page, counts] = await Promise.all([repo.wa.listInbox(f), repo.wa.inboxCounts({ unitIds })]);
      const events = new Map<string, { id: string; title: I18nText }>();
      for (const i of page.rows) {
        if (i.eventId && !events.has(i.eventId)) {
          const ev = await repo.eventById(i.eventId);
          if (ev) events.set(ev.id, { id: ev.id, title: i18n(ev.titleEn, ev.titleHi) });
        }
      }
      return {
        data: page.rows.map((i) => toRow(i, i.eventId ? (events.get(i.eventId) ?? null) : null)),
        meta: { page: q.page, pageSize: q.pageSize, total: page.total, counts },
      };
    },

    async get(actor, id) {
      return detail(actor, await load(actor, id));
    },

    async patch(actor, id, body) {
      const item = await load(actor, id);
      requireCan(actor, item, "edit");
      if (item.version !== body.version) throw new ApiError("CONFLICT");
      const patch: Parameters<typeof repo.wa.writeInbox>[0]["patch"] = {};
      const notes: string[] = [];
      let action: InboxHistoryRec["action"] = "edited";
      let matchedDef: FormDefinition | null = null;

      if (body.eventId !== undefined && body.eventId !== item.eventId) {
        if (body.eventId) {
          const ev = await repo.eventById(body.eventId);
          if (!ev || !(actor.all || actor.unitIds.has(ev.samithiId))) throw new ApiError("VALIDATION_FAILED", { fields: { eventId: "Choose an event from the list." } });
          const c = await definitionOf(ev.id);
          matchedDef = c?.def ?? null;
          notes.push(`Matched to ${ev.titleEn}`);
          action = "matched";
        } else notes.push("Event match removed");
        patch.eventId = body.eventId;
        patch.scopeId = body.eventId ? ((await repo.eventById(body.eventId))?.samithiId ?? item.scopeId) : item.scopeId;
        // A new form means a new draft, unless the reviewer sent their own answers too.
        if (!body.answers) {
          const r = await extract(item.rawText, matchedDef);
          patch.draftAnswers = r?.answers ?? {};
          patch.fieldConfidence = r?.fieldConfidence ?? {};
        }
      }
      if (body.answers) {
        patch.draftAnswers = body.answers;
        // A person has looked at these values: they stop being flagged.
        const fc: InboxItemRec["fieldConfidence"] = {};
        for (const k of Object.keys(body.answers)) fc[k] = { level: "high", why: null };
        patch.fieldConfidence = fc;
        action = body.eventId !== undefined && body.eventId !== item.eventId ? "matched" : "edited";
        notes.push("Answers edited");
      }
      if (Object.keys(patch).length === 0) return detail(actor, item);
      patch.confidence = overallConfidence(patch.fieldConfidence ?? item.fieldConfidence, (patch.eventId ?? item.eventId) !== null);
      const next = await write(actor, item, body.version, patch, { action, note: notes.join("; ") || null }, "inbox.edit");
      return detail(actor, next);
    },

    async approve(actor, id, body) {
      const item = await load(actor, id);
      requireCan(actor, item, "approve");
      if (item.version !== body.version) throw new ApiError("CONFLICT");
      const ev = await repo.eventById(body.eventId);
      if (!ev || !(actor.all || actor.unitIds.has(ev.samithiId))) throw new ApiError("VALIDATION_FAILED", { fields: { eventId: "Choose an event from the list." } });
      const c = await ctx.links.reportContext(ev.id, "en");
      const src: Exclude<Source, "form" | "portal"> = item.source === "upload" || item.source === "scan" ? item.source : "whatsapp";
      await ctx.links.submitExternal({
        eventId: ev.id,
        answers: { ...c.prefill, ...body.answers },
        source: src,
        byLabel: item.senderMasked,
        byHash: item.senderHash,
        byMasked: item.senderMasked,
        locale: "en",
      });
      const next = await write(
        actor,
        item,
        body.version,
        { state: "done", outcome: "approved", eventId: ev.id, scopeId: ev.samithiId, draftAnswers: body.answers, awaitingReply: false },
        { action: "approved", note: ev.titleEn },
        "inbox.approve",
      );
      return detail(actor, next);
    },

    async escalate(actor, id, body) {
      const item = await load(actor, id);
      requireCan(actor, item, "escalate");
      const next = await write(actor, item, body.version, { state: "escalated" }, { action: "escalated", note: body.note ?? null }, "inbox.escalate");
      return detail(actor, next);
    },

    async reject(actor, id, body) {
      const item = await load(actor, id);
      requireCan(actor, item, "reject");
      if (item.version !== body.version) throw new ApiError("CONFLICT");
      const next = await write(actor, item, body.version, { state: "done", outcome: "rejected", awaitingReply: false }, { action: "rejected", note: body.reason }, "inbox.reject");
      await messageSender(
        ctx,
        await sealedSender(item),
        (l) => (l === "hi" ? `आपकी भेजी जानकारी स्वीकार नहीं की जा सकी। कारण: ${body.reason}` : `We couldn't accept what you sent. Reason: ${body.reason}`),
        { inboxItemId: item.id },
      );
      return detail(actor, next);
    },

    async ask(actor, id, body) {
      const item = await load(actor, id);
      requireCan(actor, item, "ask");
      if (item.version !== body.version) throw new ApiError("CONFLICT");
      const sent = await messageSender(
        ctx,
        await sealedSender(item),
        () => `${actor.name}: ${body.question}`,
        { inboxItemId: item.id },
      );
      if (!sent) throw new ApiError("PROVIDER_UNAVAILABLE");
      const next = await write(actor, item, body.version, { awaitingReply: true }, { action: "asked", note: body.question }, "inbox.ask");
      return detail(actor, next);
    },

    async openMedia(actor, id, messageId) {
      const item = await load(actor, id);
      let path = item.mediaPath;
      let name = item.mediaName;
      if (messageId) {
        const m = (await repo.wa.messages({ inboxItemId: id })).find((x) => x.id === messageId);
        if (!m?.mediaPath) throw new ApiError("NOT_FOUND");
        path = m.mediaPath;
        name = m.mediaName;
      }
      if (!path) throw new ApiError("NOT_FOUND");
      await repo.portal.insertAudit(auditRec(actor, { action: "inbox.view_media", entity: "inbox_item", entityId: id, scopeId: item.scopeId ?? item.districtId, data: { name } }));
      const mime = path.endsWith(".pdf") ? "application/pdf" : path.endsWith(".png") ? "image/png" : path.endsWith(".webp") ? "image/webp" : "image/jpeg";
      return { path, mime, name: name ?? "file" };
    },

    async ingest(i) {
      const at = now();
      const conv = i.conversation;
      const reply = i.note?.startsWith("reply:") ? i.note.slice(6) : null;

      // A sender answering a question: append to the thread and fill gaps in the draft.
      if (reply) {
        const item = await repo.wa.inboxById(reply);
        if (item) {
          const merged = [item.rawText, i.text].filter(Boolean).join("\n");
          const def = await definitionOf(item.eventId);
          const r = await extract(merged, def?.def ?? null);
          const draft = { ...item.draftAnswers };
          const fc = { ...item.fieldConfidence };
          for (const [k, v] of Object.entries(r?.answers ?? {})) {
            if (!(k in draft)) {
              draft[k] = v;
              if (r?.fieldConfidence[k]) fc[k] = r.fieldConfidence[k];
            }
          }
          await repo.wa.writeInbox({
            id: item.id,
            expectVersion: item.version,
            at,
            patch: { awaitingReply: false, draftAnswers: draft, fieldConfidence: fc, confidence: overallConfidence(fc, item.eventId !== null) },
            history: [{ itemId: item.id, action: "sender_replied", byRole: null, byLabel: item.senderMasked, byUserId: null, note: i.text, at }],
          });
          return (await repo.wa.inboxById(item.id)) as InboxItemRec;
        }
      }

      const org = await loadOrg(repo);
      const a = i.actor;
      const scopeId = a?.role === "samithi_coord" ? a.scopeId : null;
      const districtId = scopeId ? (org.districtIdOf(scopeId) ?? null) : a?.role === "district_coord" ? a.scopeId : null;
      const id = newId();

      let mediaPath: string | null = null;
      let rawKind: InboxItemRec["rawKind"] = "text";
      if (i.media) {
        rawKind = i.media.kind === "pdf" ? "pdf" : "image";
        if (i.media.bytes) {
          const kind = sniffMime(i.media.bytes);
          if (kind) {
            const rel = `inbox/${id}.${kind.ext}`;
            try {
              await deps.storage.put(rel, i.media.bytes);
              mediaPath = rel;
            } catch (err) {
              console.error("[inbox] could not store media", err instanceof Error ? err.message : err);
            }
          }
        }
      }

      const base = { scopeId, districtId, receivedAt: at };
      const handoff = i.note === "human_handoff";
      const candidates = handoff ? [] : await candidatesFor(base, a);
      const matched = handoff ? null : matchEvent(candidates, i.text, at);
      const def = matched ? await definitionOf(matched.ev.id) : null;
      const result = await extract(i.text, def?.def ?? null);
      const fc = result?.fieldConfidence ?? {};
      let confidence = overallConfidence(fc, !!matched);
      if (matched && matched.level === "low") confidence = "low";
      else if (matched && matched.level === "check" && confidence === "high") confidence = "check";

      const item: InboxItemRec = {
        id,
        source: "whatsapp",
        senderHash: conv.phoneHash,
        senderEnc: conv.phoneEnc,
        senderMasked: conv.phoneMasked,
        conversationId: conv.id,
        scopeId: matched?.ev.samithiId ?? scopeId,
        districtId: matched?.ev.districtId ?? districtId,
        receivedAt: at,
        state: "for_me",
        outcome: null,
        eventId: matched?.ev.id ?? null,
        rawKind,
        rawText: i.text,
        mediaPath,
        mediaName: i.media?.name ?? null,
        draftAnswers: result?.answers ?? {},
        fieldConfidence: fc,
        confidence,
        aiModel: result?.model ?? null,
        aiDraftedAt: result ? at : null,
        awaitingReply: false,
        version: 1,
        updatedAt: at,
      };
      const history: InboxHistoryRec[] = [];
      if (handoff) history.push({ itemId: id, action: "ai_drafted", byRole: null, byLabel: "Asked for a person", byUserId: null, note: "The sender asked to talk to a coordinator.", at });
      else if (result) history.push({ itemId: id, action: "ai_drafted", byRole: null, byLabel: `AI draft (${result.model})`, byUserId: null, note: matched?.why ?? null, at });
      await repo.wa.insertInbox(item, history);
      return item;
    },
  };
  return service;
}
