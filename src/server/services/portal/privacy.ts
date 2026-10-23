// Privacy desk (spec 47): DPDP requests (find / export / erase / reply), consent summary,
// retention jobs, breach register, data-protection lead. Names and phones are read only
// through audited paths; erase keeps event counts (they hold no personal data).
import type {
  Breach,
  BreachCreate,
  BreachPatch,
  ConsentSummary,
  DataProtectionLead,
  Paged,
  PersonDataKind,
  PersonDataMatch,
  PrivacyEraseBody,
  PrivacyOverview,
  PrivacyReplyBody,
  PrivacyRequestDetail,
  PrivacyRequestPatch,
  PrivacyRequestRow,
  PrivacyRequestsQuery,
  PrivacyStep,
  RetentionJob,
  RetentionKey,
} from "@/contract";
import { auditRec, type SystemActor } from "../../audit";
import { type Actor, assertCan, can } from "../../auth/rbac";
import { newId } from "../../db/columns";
import { addDays, istDate, istDayStart, toIso, toIsoOrNull } from "../../domain/time";
import { ApiError } from "../../http/errors";
import type { PrivacyRequestFull } from "../../repo/privacy-types";
import { decryptField } from "../../security/crypto";
import { maskPhone, normalisePhone, phoneHash } from "../../security/phone";
import { pageOf, type PortalCtx } from "./shared";
import type { FollowUpData } from "./followup";

export interface RetentionRunResult {
  key: RetentionKey;
  deleted: number;
}

export interface PrivacyService {
  overview(actor: Actor): Promise<PrivacyOverview>;
  setDpo(actor: Actor, body: DataProtectionLead): Promise<DataProtectionLead>;
  requests(actor: Actor, q: PrivacyRequestsQuery): Promise<Paged<PrivacyRequestRow>>;
  request(actor: Actor, id: string): Promise<PrivacyRequestDetail>;
  patchRequest(actor: Actor, id: string, body: PrivacyRequestPatch): Promise<PrivacyRequestDetail>;
  find(actor: Actor, id: string, body: { version: number }): Promise<PrivacyRequestDetail>;
  exportJson(actor: Actor, id: string): Promise<Record<string, unknown>>;
  erase(actor: Actor, id: string, body: PrivacyEraseBody): Promise<PrivacyRequestDetail>;
  reply(actor: Actor, id: string, body: PrivacyReplyBody): Promise<PrivacyRequestDetail>;
  consents(actor: Actor): Promise<ConsentSummary>;
  retention(actor: Actor): Promise<RetentionJob[]>;
  setRetention(actor: Actor, key: string, enabled: boolean): Promise<RetentionJob[]>;
  breaches(actor: Actor): Promise<Breach[]>;
  createBreach(actor: Actor, body: BreachCreate): Promise<Breach>;
  patchBreach(actor: Actor, id: string, body: BreachPatch): Promise<Breach>;
  /** Cron `retention`: purges everything past its period for each enabled key. */
  runRetention(by: SystemActor): Promise<RetentionRunResult[]>;
}

const STEPS: PrivacyStep[] = ["found", "exported", "erased", "replied"];
const OPEN_STATUSES = ["received", "in_progress"];
const BREACH_STEPS = ["contain", "assess", "notify_board", "notify_people", "lessons"] as const;
const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

const RETENTION: { key: RetentionKey; en: string; hi: string; locked: boolean }[] = [
  { key: "volunteer_signups", en: "30 days after the event", hi: "कार्यक्रम के 30 दिन बाद", locked: false },
  { key: "whatsapp_messages", en: "30 days", hi: "30 दिन", locked: false },
  { key: "inbox_media", en: "30 days after review", hi: "समीक्षा के 30 दिन बाद", locked: false },
  { key: "register_scans", en: "1 year after approval", hi: "स्वीकृति के 1 वर्ष बाद", locked: false },
  { key: "followup", en: "1 year after surgery, decline or last contact", hi: "ऑपरेशन, इनकार या अंतिम संपर्क के 1 वर्ष बाद", locked: false },
  { key: "privacy_requests", en: "1 year after closing", hi: "बंद होने के 1 वर्ष बाद", locked: false },
  { key: "otp", en: "1 day", hi: "1 दिन", locked: true },
];

const refOf = (n: number) => `PR-${String(n).padStart(4, "0")}`;

/** True when any string inside is a phone number equal to `phone` (E.164). */
function holdsPhone(v: unknown, phone: string): boolean {
  if (typeof v === "string") return normalisePhone(v) === phone;
  if (Array.isArray(v)) return v.some((x) => holdsPhone(x, phone));
  if (v && typeof v === "object") return Object.values(v).some((x) => holdsPhone(x, phone));
  return false;
}

/**
 * Removes the records that carry `phone`: a top-level object with the phone clears all (a sign-up),
 * array items (camp follow-up lists) are dropped one by one so other people stay.
 */
function scrub(personal: Record<string, unknown>, phone: string): { value: Record<string, unknown> | null; removed: number } {
  const direct = Object.values(personal).some((x) => typeof x === "string" && normalisePhone(x) === phone);
  if (direct) return { value: null, removed: 1 };
  let removed = 0;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(personal)) {
    if (Array.isArray(v)) {
      const keep = v.filter((item) => !holdsPhone(item, phone));
      removed += v.length - keep.length;
      out[k] = keep;
    } else out[k] = v;
  }
  return { value: removed ? out : personal, removed };
}

export function createPrivacyService(ctx: PortalCtx): PrivacyService {
  const { repo, deps } = ctx;

  function assertRead(actor: Actor) {
    if (!can(actor, "privacy.read") && !can(actor, "privacy.manage")) assertCan(actor, "privacy.read");
  }
  const assertManage = (actor: Actor) => assertCan(actor, "privacy.manage");

  async function load(id: string) {
    const rec = await repo.privacy.requestById(id);
    if (!rec) throw new ApiError("NOT_FOUND");
    return rec;
  }

  async function refs(): Promise<Map<string, string>> {
    return new Map((await repo.privacy.requests()).map((r, i) => [r.id, refOf(i + 1)]));
  }

  async function names(ids: (string | null)[]) {
    const users = await repo.portal.usersByIds([...new Set(ids.filter((x): x is string => !!x))]);
    return new Map(users.map((u) => [u.id, u.name]));
  }

  async function rowOf(r: PrivacyRequestFull, ref: string, nm: Map<string, string>): Promise<PrivacyRequestRow> {
    const dueMs = r.dueAt.getTime() - deps.now().getTime();
    return {
      id: r.id,
      ref,
      name: r.name,
      phone: maskPhone(r.phone),
      type: r.type,
      receivedAt: toIso(r.createdAt),
      dueAt: toIso(r.dueAt),
      daysLeft: OPEN_STATUSES.includes(r.status) ? Math.ceil(dueMs / DAY_MS) : Math.ceil((r.dueAt.getTime() - (r.closedAt ?? deps.now()).getTime()) / DAY_MS),
      status: r.status,
      assignee: r.assigneeId ? { id: r.assigneeId, name: nm.get(r.assigneeId) ?? "—" } : null,
      closedAt: toIsoOrNull(r.closedAt),
    };
  }

  const stepMap = (steps: string[]) => {
    const out = Object.fromEntries(STEPS.map((s) => [s, null])) as Record<PrivacyStep, string | null>;
    for (const e of steps) {
      const [k, at] = e.split("@");
      if ((STEPS as string[]).includes(k)) out[k as PrivacyStep] = at ?? null;
    }
    return out;
  };

  const withStep = (steps: string[], step: PrivacyStep) => [...steps.filter((e) => !e.startsWith(`${step}@`)), `${step}@${toIso(deps.now())}`];

  // ---- sources by phone ----------------------------------------------------

  interface Found extends PersonDataMatch {
    /** What an export carries for this record. */
    data: () => Promise<unknown>;
    /** Deletes/anonymises it; returns the count removed. */
    erase: () => Promise<number>;
  }

  async function matchesFor(req: PrivacyRequestFull): Promise<Found[]> {
    const phone = normalisePhone(req.phone) ?? req.phone;
    const hash = phoneHash(deps.secret, phone);
    const out: Found[] = [];

    // Submissions with personal answers: public sign-ups vs. camp follow-up lists and the like.
    const subs = (await repo.privacy.personalSubmissions()).filter((s) => holdsPhone(s.personalAnswers, phone));
    if (subs.length) {
      const eventIds = [...new Set(subs.map((s) => s.eventId))];
      const publicLinks = new Set((await repo.portal.linksForEvents(eventIds)).filter((l) => l.purpose === "public").map((l) => l.id));
      for (const s of subs) {
        const ev = await repo.eventById(s.eventId);
        const volunteer = !!s.linkId && publicLinks.has(s.linkId);
        out.push({
          id: s.id,
          kind: volunteer ? "volunteer_signup" : "submission_personal",
          label: `${volunteer ? "Volunteer sign-up" : "Report personal answers"}: ${ev?.titleEn ?? "event"}`,
          at: toIso(s.submittedAt),
          erasable: true,
          data: async () => scrub(s.personalAnswers, phone).value === null ? s.personalAnswers : pickMatching(s.personalAnswers, phone),
          erase: async () => {
            const res = scrub(s.personalAnswers, phone);
            await repo.privacy.writePersonal(s.id, res.value);
            return res.removed;
          },
        });
      }
    }

    for (const f of await repo.m6.docList<FollowUpData>("followup_person")) {
      const p = f.data.phoneEnc ? decryptField(deps.secret, f.data.phoneEnc) : null;
      if (p !== phone) continue;
      out.push({
        id: f.id,
        kind: "followup",
        label: `Follow-up list: ${f.data.status}`,
        at: toIso(f.createdAt),
        erasable: true,
        data: async () => ({ name: f.data.name, age: f.data.age, gender: f.data.gender, locality: f.data.locality, status: f.data.status, referredAt: f.data.referredAt, surgeryDate: f.data.surgeryDate }),
        erase: async () => {
          for (const l of await repo.m6.docList("followup_log", { k1: f.id })) await repo.m6.docDelete("followup_log", l.id);
          return (await repo.m6.docDelete("followup_person", f.id)) ? 1 : 0;
        },
      });
    }

    const optin = await repo.wa.optInByHash(hash);
    if (optin)
      out.push({
        id: optin.id,
        kind: "whatsapp_optin",
        label: `WhatsApp updates: ${optin.status}`,
        at: toIsoOrNull(optin.consentAt ?? optin.requestedAt),
        erasable: true,
        data: async () => ({ status: optin.status, seva: optin.sevaTypes, locale: optin.locale, requestedAt: toIso(optin.requestedAt), consentAt: toIsoOrNull(optin.consentAt), stoppedAt: toIsoOrNull(optin.stoppedAt) }),
        erase: async () => ((await repo.privacy.deleteOptIn(optin.id)) ? 1 : 0),
      });

    const conv = await repo.wa.conversationByHash(hash);
    if (conv)
      out.push({
        id: conv.id,
        kind: "whatsapp_conversation",
        label: `WhatsApp chat (${conv.messageCount} messages)`,
        at: toIso(conv.lastAt),
        erasable: true,
        data: async () => (await repo.wa.messages({ phoneHash: hash })).map((m) => ({ at: toIso(m.createdAt), dir: m.dir, kind: m.kind, text: m.text })),
        erase: async () => {
          await repo.wa.deleteConversationData(hash);
          return conv.messageCount || 1;
        },
      });

    const user = await repo.portal.userByPhoneHash(hash);
    if (user)
      out.push({ id: user.id, kind: "portal_user", label: "Portal account (manage under People)", at: toIso(user.createdAt), erasable: false, data: async () => ({ name: user.name, email: user.email, status: user.status }), erase: async () => 0 });

    for (const o of await repo.privacy.requests())
      if ((normalisePhone(o.phone) ?? o.phone) === phone)
        out.push({ id: o.id, kind: "privacy_request", label: `Privacy request ${o.id === req.id ? "(this one)" : ""}`.trim(), at: toIso(o.createdAt), erasable: false, data: async () => ({ type: o.type, details: o.details, status: o.status }), erase: async () => 0 });

    return out;
  }

  /** Export view of a submission: only the records that carry the phone. */
  function pickMatching(personal: Record<string, unknown>, phone: string) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(personal)) {
      if (Array.isArray(v)) out[k] = v.filter((x) => holdsPhone(x, phone));
      else if (holdsPhone(v, phone)) out[k] = v;
    }
    return out;
  }

  const publicMatch = ({ id, kind, label, at, erasable }: Found): PersonDataMatch => ({ id, kind, label, at, erasable });

  async function detail(actor: Actor, req: PrivacyRequestFull): Promise<PrivacyRequestDetail> {
    const ref = (await refs()).get(req.id) ?? refOf(0);
    const steps = stepMap(req.steps);
    const audit = await repo.portal.listAudit({ entity: "privacy_request", entityId: req.id, limit: 100, offset: 0 });
    const nm = await names([req.assigneeId, ...audit.rows.map((a) => a.actorId)]);
    return {
      ...(await rowOf(req, ref, nm)),
      details: req.details,
      locale: req.locale,
      matches: steps.found ? (await matchesFor(req)).map(publicMatch) : null,
      steps,
      history: audit.rows.map((a) => ({ at: toIso(a.at), by: a.actorId ? (nm.get(a.actorId) ?? a.actorRole) : (a.actorRole ?? null), action: a.action })),
      can: { act: can(actor, "privacy.manage") },
      version: req.version,
    };
  }

  async function act(actor: Actor, id: string, version: number, action: string, patch: Parameters<typeof repo.privacy.updateRequest>[1], data: Record<string, unknown> = {}) {
    const cur = await load(id);
    if (cur.version !== version) throw new ApiError("CONFLICT");
    const next = { ...patch };
    if (cur.status === "received" && !patch.status) next.status = "in_progress";
    const res = await repo.privacy.updateRequest(id, next, version, [auditRec(actor, { action, entity: "privacy_request", entityId: id, data })]);
    if (res === "conflict") throw new ApiError("CONFLICT");
    return load(id);
  }

  // ---- retention -----------------------------------------------------------

  async function enabledMap(): Promise<Record<string, boolean>> {
    const raw = (await repo.settings(["privacy.retention"])).get("privacy.retention");
    return typeof raw === "object" && raw !== null ? (raw as Record<string, boolean>) : {};
  }

  /** Items past their period, per key. `ids` is what a run deletes; `n` is the `due` count. */
  async function dueItems(key: RetentionKey, now: Date): Promise<{ n: number; run: () => Promise<number> }> {
    const ago = (days: number) => new Date(now.getTime() - days * DAY_MS);
    const storage = deps.storage;
    const drop = async (paths: string[]) => {
      for (const p of paths) await storage?.delete?.(p).catch(() => false);
    };
    switch (key) {
      case "volunteer_signups": {
        const subs = await repo.privacy.personalSubmissions();
        const publicLinks = new Set((await repo.portal.linksForEvents([...new Set(subs.map((s) => s.eventId))])).filter((l) => l.purpose === "public").map((l) => l.id));
        const due: string[] = [];
        for (const s of subs) {
          if (!s.linkId || !publicLinks.has(s.linkId)) continue;
          const ev = await repo.eventById(s.eventId);
          if (ev && (ev.endsAt ?? ev.startsAt).getTime() + 30 * DAY_MS < now.getTime()) due.push(s.id);
        }
        return { n: due.length, run: () => repo.privacy.clearPersonal(due, [auditRec({ kind: "system" }, { action: "retention.volunteer_signups", entity: "submission", entityId: null, data: { count: due.length } })]) };
      }
      case "whatsapp_messages": {
        const before = ago(30);
        return {
          n: await repo.privacy.messagesDue(before),
          run: async () => {
            const res = await repo.privacy.scrubMessages(before);
            await drop(res.media);
            return res.count;
          },
        };
      }
      case "inbox_media": {
        const due = await repo.privacy.inboxMediaDue(ago(30));
        return {
          n: due.length,
          run: async () => {
            await drop(due.map((d) => d.path));
            await repo.privacy.clearInboxMedia(due.map((d) => d.id));
            return due.length;
          },
        };
      }
      case "register_scans": {
        const due = await repo.privacy.attachmentsDue(now);
        return {
          n: due.length,
          run: async () => {
            await drop(due.map((d) => d.path));
            await repo.privacy.deleteAttachments(due.map((d) => d.id));
            return due.length;
          },
        };
      }
      case "followup": {
        const today = istDate(now);
        const due = (await repo.m6.docList<FollowUpData>("followup_person")).filter((f) => f.data.deleteOn && f.data.deleteOn <= today);
        return {
          n: due.length,
          run: async () => {
            for (const f of due) {
              for (const l of await repo.m6.docList("followup_log", { k1: f.id })) await repo.m6.docDelete("followup_log", l.id);
              await repo.m6.docDelete("followup_person", f.id);
            }
            return due.length;
          },
        };
      }
      case "privacy_requests": {
        const due = (await repo.privacy.requests()).filter((r) => r.closedAt && r.closedAt.getTime() + 365 * DAY_MS < now.getTime());
        return { n: due.length, run: () => repo.privacy.deleteRequests(due.map((r) => r.id), [auditRec({ kind: "system" }, { action: "retention.privacy_requests", entity: "privacy_request", entityId: null, data: { count: due.length } })]) };
      }
      case "otp": {
        const before = ago(1);
        return { n: await repo.privacy.otpDue(before), run: () => repo.privacy.deleteOtp(before) };
      }
    }
  }

  async function retentionJobs(): Promise<RetentionJob[]> {
    const now = deps.now();
    const enabled = await enabledMap();
    const next = new Date(istDayStart(addDays(istDate(now), 1)).getTime() + 3 * HOUR_MS);
    const out: RetentionJob[] = [];
    for (const r of RETENTION) {
      const last = (await repo.m6.docList<{ deleted: number }>("retention_run", { k1: r.key, limit: 1 }))[0];
      const on = r.locked || enabled[r.key] !== false;
      out.push({
        key: r.key,
        keptFor: { en: r.en, hi: r.hi },
        lastRunAt: last ? toIso(last.createdAt) : null,
        lastDeleted: last ? last.data.deleted : null,
        nextRunAt: on ? toIso(next) : null,
        due: (await dueItems(r.key, now)).n,
        enabled: on,
        locked: r.locked,
      });
    }
    return out;
  }

  // ---- breaches ------------------------------------------------------------

  async function breachList(): Promise<Breach[]> {
    return (await repo.m6.docList<Omit<Breach, "id" | "version">>("breach", { order: "desc" })).map((b) => ({ ...b.data, id: b.id, version: b.version }));
  }

  const breachOf = async (id: string) => {
    const rec = await repo.m6.docGet<Omit<Breach, "id" | "version">>("breach", id);
    if (!rec) throw new ApiError("NOT_FOUND");
    return rec;
  };

  return {
    async overview(actor) {
      assertRead(actor);
      const now = deps.now().getTime();
      const open = (await repo.privacy.requests()).filter((r) => OPEN_STATUSES.includes(r.status));
      const dpo = (await repo.settings(["privacy.dpo"])).get("privacy.dpo") as Partial<DataProtectionLead> | undefined;
      return {
        dpo: { name: dpo?.name ?? null, contact: dpo?.contact ?? null },
        counts: { openRequests: open.length, overdueRequests: open.filter((r) => r.dueAt.getTime() < now).length, openBreaches: (await breachList()).filter((b) => b.status === "open").length },
        can: { manage: can(actor, "privacy.manage"), editDpo: actor.role === "state_admin" },
      };
    },

    async setDpo(actor, body) {
      assertManage(actor);
      if (actor.role !== "state_admin") throw new ApiError("FORBIDDEN");
      const value = { name: body.name?.trim() || null, contact: body.contact?.trim() || null };
      await repo.m6.setSetting("privacy.dpo", value, actor.userId, [auditRec(actor, { action: "privacy.dpo", entity: "setting", entityId: "privacy.dpo", data: { named: !!value.name } })]);
      return value;
    },

    async requests(actor, q) {
      assertRead(actor);
      const refMap = await refs();
      const all = (await repo.privacy.requests()).reverse();
      const rows = all.filter((r) => !q.status || (q.status === "open" ? OPEN_STATUSES.includes(r.status) : r.status === q.status));
      const nm = await names(rows.map((r) => r.assigneeId));
      const page = pageOf(rows, q.page, q.pageSize);
      const data = await Promise.all(page.data.map((r) => rowOf(r, refMap.get(r.id) ?? "", nm)));
      // Names/phones (masked) were listed: counted, never itemised.
      await repo.portal.insertAudit(auditRec(actor, { action: "privacy.list", entity: "privacy_request", entityId: null, data: { count: data.length } }));
      return { data, meta: page.meta };
    },

    async request(actor, id) {
      assertRead(actor);
      const req = await load(id);
      await repo.portal.insertAudit(auditRec(actor, { action: "privacy.open", entity: "privacy_request", entityId: id }));
      return detail(actor, req);
    },

    async patchRequest(actor, id, body) {
      assertManage(actor);
      const patch: Parameters<typeof repo.privacy.updateRequest>[1] = {};
      if (body.status) {
        patch.status = body.status;
        patch.closedAt = body.status === "done" || body.status === "rejected" ? deps.now() : null;
      }
      if (body.assigneeId !== undefined) {
        if (body.assigneeId && !(await repo.portal.userById(body.assigneeId))) throw new ApiError("VALIDATION_FAILED", { fields: { assigneeId: "Unknown person." } });
        patch.assigneeId = body.assigneeId;
      }
      return detail(actor, await act(actor, id, body.version, "privacy.update", patch, { status: body.status ?? null, assigneeId: body.assigneeId ?? null }));
    },

    async find(actor, id, body) {
      assertManage(actor);
      const req = await load(id);
      const found = await matchesFor(req);
      const updated = await act(actor, id, body.version, "privacy.find", { steps: withStep(req.steps, "found") }, { matches: found.length });
      return detail(actor, updated);
    },

    async exportJson(actor, id) {
      assertManage(actor);
      const req = await load(id);
      const found = await matchesFor(req);
      const records = [];
      for (const f of found) records.push({ kind: f.kind, label: f.label, at: f.at, data: await f.data() });
      await act(actor, id, req.version, "privacy.export", { steps: withStep(req.steps, "exported") }, { records: found.length });
      return { request: { ref: (await refs()).get(id), type: req.type, name: req.name, receivedAt: toIso(req.createdAt) }, generatedAt: toIso(deps.now()), records };
    },

    async erase(actor, id, body) {
      assertManage(actor);
      const req = await load(id);
      if (req.version !== body.version) throw new ApiError("CONFLICT");
      const chosen = new Set(body.matchIds);
      const found = (await matchesFor(req)).filter((f) => chosen.has(f.id));
      if (found.some((f) => !f.erasable) || found.length !== chosen.size) throw new ApiError("VALIDATION_FAILED", { fields: { matchIds: "Some records cannot be erased here." } });
      const counts: Partial<Record<PersonDataKind, number>> = {};
      for (const f of found) counts[f.kind] = (counts[f.kind] ?? 0) + (await f.erase());
      return detail(actor, await act(actor, id, body.version, "privacy.erase", { steps: withStep(req.steps, "erased") }, { counts }));
    },

    async reply(actor, id, body) {
      assertManage(actor);
      const req = await load(id);
      await deps.whatsapp.sendTemplate(normalisePhone(req.phone) ?? req.phone, "privacy_reply", req.locale, [body.message]);
      return detail(actor, await act(actor, id, body.version, "privacy.reply", { steps: withStep(req.steps, "replied") }, { length: body.message.length }));
    },

    async consents(actor) {
      assertRead(actor);
      const titles = new Map((await repo.links.templates()).map((t) => [t.id, { en: t.titleEn, hi: t.titleHi }]));
      const groups = new Map<string, ConsentSummary["byForm"][number]>();
      const withdrawals: ConsentSummary["recentWithdrawals"] = [];
      for (const c of await repo.privacy.consentRows()) {
        const k = `${c.templateId}:${c.purpose}`;
        const g = groups.get(k) ?? { templateId: c.templateId, form: titles.get(c.templateId) ?? { en: "Form", hi: null }, purpose: c.purpose, given: 0, withdrawn: 0, lastAt: null };
        if (c.withdrawnAt) {
          g.withdrawn++;
          withdrawals.push({ at: toIso(c.withdrawnAt), form: g.form, purpose: c.purpose });
        } else g.given++;
        const at = toIso(c.withdrawnAt ?? c.givenAt);
        if (!g.lastAt || at > g.lastAt) g.lastAt = at;
        groups.set(k, g);
      }
      return { byForm: [...groups.values()], whatsappOptins: await repo.privacy.optinCounts(), recentWithdrawals: withdrawals.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 10) };
    },

    async retention(actor) {
      assertRead(actor);
      return retentionJobs();
    },

    async setRetention(actor, key, enabled) {
      assertManage(actor);
      const def = RETENTION.find((r) => r.key === key);
      if (!def) throw new ApiError("NOT_FOUND");
      if (def.locked) throw new ApiError("VALIDATION_FAILED", { fields: { enabled: "This job always runs." } });
      const cur = await enabledMap();
      await repo.m6.setSetting("privacy.retention", { ...cur, [key]: enabled }, actor.userId, [auditRec(actor, { action: "privacy.retention", entity: "setting", entityId: key, data: { enabled } })]);
      return retentionJobs();
    },

    async breaches(actor) {
      assertRead(actor);
      return breachList();
    },

    async createBreach(actor, body) {
      assertManage(actor);
      const at = body.discoveredAt ? new Date(body.discoveredAt) : deps.now();
      const n = (await repo.m6.docList("breach")).length + 1;
      const rec: Omit<Breach, "id" | "version"> = {
        ref: `BR-${String(n).padStart(3, "0")}`,
        title: body.title,
        details: body.details ?? "",
        discoveredAt: toIso(at),
        deadlineAt: toIso(new Date(at.getTime() + 72 * HOUR_MS)),
        status: "open",
        affected: null,
        steps: BREACH_STEPS.map((key) => ({ key, doneAt: null, by: null, note: null })),
        createdBy: actor.name,
        closedAt: null,
      };
      const id = newId();
      await repo.m6.docInsert("breach", { id, k1: "open", data: rec }, [auditRec(actor, { action: "breach.create", entity: "breach", entityId: id, data: { ref: rec.ref } })]);
      return { ...rec, id, version: 1 };
    },

    async patchBreach(actor, id, body) {
      assertManage(actor);
      const cur = await breachOf(id);
      if (cur.version !== body.version) throw new ApiError("CONFLICT");
      const d = structuredClone(cur.data);
      if (body.step) {
        const s = d.steps.find((x) => x.key === body.step!.key);
        if (!s) throw new ApiError("VALIDATION_FAILED", { fields: { step: "Unknown step." } });
        s.doneAt = body.step.done ? toIso(deps.now()) : null;
        s.by = body.step.done ? actor.name : null;
        s.note = body.step.note ?? s.note;
      }
      if (body.affected !== undefined) d.affected = body.affected;
      if (body.status) {
        d.status = body.status;
        d.closedAt = body.status === "closed" ? toIso(deps.now()) : null;
      }
      const res = await repo.m6.docUpdate("breach", { id, k1: d.status, data: d }, body.version, [
        auditRec(actor, { action: "breach.update", entity: "breach", entityId: id, data: { step: body.step?.key ?? null, status: body.status ?? null } }),
      ]);
      if (!res.ok) throw new ApiError("CONFLICT");
      return { ...d, id, version: res.version };
    },

    async runRetention(by: SystemActor) {
      const now = deps.now();
      const enabled = await enabledMap();
      const out: RetentionRunResult[] = [];
      for (const r of RETENTION) {
        if (!r.locked && enabled[r.key] === false) continue;
        const deleted = await (await dueItems(r.key, now)).run();
        await repo.m6.docInsert("retention_run", { id: newId(), k1: r.key, data: { key: r.key, deleted } }, [
          auditRec(by, { action: "retention.run", entity: "retention", entityId: r.key, data: { deleted } }),
        ]);
        out.push({ key: r.key, deleted });
      }
      return out;
    },
  };
}
