// Follow-up list (spec 46, restricted): people referred at eye camps who agreed to be
// contacted. Populated when a report is approved; phones masked everywhere except the
// logged reveal; every read of names writes an audit row. NCR-wide roles only.
import type { FollowUpCall, FollowUpDetail, FollowUpLogEntry, FollowUpPatch, FollowUpQuery, FollowUpRow, FollowUpStatus, Paged, RevealedPhone } from "@/contract";
import { auditRec } from "../../audit";
import { type Actor, assertCan } from "../../auth/rbac";
import { newId } from "../../db/columns";
import { addDays, istDate, toIso } from "../../domain/time";
import { ApiError } from "../../http/errors";
import type { DocRec } from "../../repo/m6-types";
import type { EventRec } from "../../repo/types";
import { decryptField, encryptField } from "../../security/crypto";
import { maskPhone, normalisePhone } from "../../security/phone";
import { i18n } from "../org-index";
import { DAY_MS, loadOrg, pageOf, type PortalCtx } from "./shared";

export interface FollowUpService {
  list(actor: Actor, q: FollowUpQuery): Promise<Paged<FollowUpRow>>;
  get(actor: Actor, id: string): Promise<FollowUpDetail>;
  revealPhone(actor: Actor, id: string): Promise<RevealedPhone>;
  patch(actor: Actor, id: string, body: FollowUpPatch): Promise<FollowUpDetail>;
  call(actor: Actor, id: string, body: FollowUpCall): Promise<FollowUpDetail>;
}

/** Stored shape of a `followup_person` document (k1 = eventId, k2 = status). */
export interface FollowUpData {
  name: string;
  age: number | null;
  gender: "female" | "male" | "other" | null;
  locality: string | null;
  /** Sealed raw phone (E.164). */
  phoneEnc: string | null;
  consent: true;
  eventId: string;
  submissionId: string;
  samithiId: string;
  referredAt: string;
  status: FollowUpStatus;
  surgeryDate: string | null;
  lastContactAt: string | null;
  deleteOn: string | null;
  updatedAtIso: string;
}

interface LogData {
  personId: string;
  at: string;
  by: string | null;
  kind: FollowUpLogEntry["kind"];
  text: string;
}

const OPEN: FollowUpStatus[] = ["referred", "scheduled", "unreachable"];
const yes = (v: unknown) => v === true || v === "yes" || v === "true" || v === 1 || v === "1";
const str = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

/** One year after surgery/decline, else after the last contact (or referral). */
export function followUpDeleteOn(d: Pick<FollowUpData, "status" | "surgeryDate" | "lastContactAt" | "referredAt">, declinedOn?: string): string {
  if (d.status === "done" && d.surgeryDate) return addDays(d.surgeryDate, 365);
  if (d.status === "declined") return addDays(declinedOn ?? (d.lastContactAt ? istDate(new Date(d.lastContactAt)) : d.referredAt), 365);
  return addDays(d.lastContactAt ? istDate(new Date(d.lastContactAt)) : d.referredAt, 365);
}

/**
 * Imports the consented follow-up rows of an approved event's submissions. Idempotent
 * (deterministic ids); rows without consent are never imported. Returns how many are new.
 */
export async function populateFollowup(ctx: PortalCtx, ev: EventRec): Promise<number> {
  const { repo, deps } = ctx;
  let added = 0;
  const referredAt = istDate(ev.endsAt ?? ev.startsAt);
  for (const s of await repo.portal.submissionsForEvent(ev.id)) {
    const rows = s.personalAnswers?.followup;
    if (!Array.isArray(rows)) continue;
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i] as Record<string, unknown> | null;
      const name = r && str(r.name, 80);
      if (!r || !name || !yes(r.consent)) continue;
      const phone = typeof r.phone === "string" ? normalisePhone(r.phone) : null;
      const age = typeof r.age === "number" && Number.isFinite(r.age) ? Math.max(0, Math.min(120, Math.round(r.age))) : null;
      const data: FollowUpData = {
        name,
        age,
        gender: r.gender === "female" || r.gender === "male" || r.gender === "other" ? r.gender : null,
        locality: str(r.locality, 80),
        phoneEnc: phone ? encryptField(deps.secret, phone) : null,
        consent: true,
        eventId: ev.id,
        submissionId: s.id,
        samithiId: ev.samithiId,
        referredAt,
        status: "referred",
        surgeryDate: null,
        lastContactAt: null,
        deleteOn: null,
        updatedAtIso: toIso(deps.now()),
      };
      data.deleteOn = followUpDeleteOn(data);
      const id = `fu_${s.id}_${i}`;
      const res = await repo.m6.docInsert<FollowUpData>("followup_person", { id, k1: ev.id, k2: "referred", data });
      if (res.ok) {
        added++;
        await repo.m6.docInsert<LogData>("followup_log", {
          id: newId(),
          k1: id,
          data: { personId: id, at: toIso(deps.now()), by: null, kind: "referred", text: `Referred at ${ev.titleEn}` },
        });
      }
    }
  }
  return added;
}

export function createFollowUpService(ctx: PortalCtx): FollowUpService {
  const { repo, deps } = ctx;

  /** Permission first, then NCR-wide only (a district role never sees this list). */
  function guard(actor: Actor, perm: "followup.read" | "followup.reveal") {
    assertCan(actor, perm);
    if (!actor.all) throw new ApiError("FORBIDDEN");
  }

  async function load(id: string) {
    const rec = await repo.m6.docGet<FollowUpData>("followup_person", id);
    if (!rec) throw new ApiError("NOT_FOUND");
    return rec;
  }

  async function row(rec: DocRec<FollowUpData>, org: Awaited<ReturnType<typeof loadOrg>>, events: Map<string, EventRec | null>): Promise<FollowUpRow> {
    const d = rec.data;
    let ev = events.get(d.eventId);
    if (ev === undefined) events.set(d.eventId, (ev = await repo.eventById(d.eventId)));
    const phone = d.phoneEnc ? decryptField(deps.secret, d.phoneEnc) : null;
    const waiting = OPEN.includes(d.status) ? Math.max(0, Math.floor((deps.now().getTime() - new Date(`${d.referredAt}T00:00:00+05:30`).getTime()) / DAY_MS)) : 0;
    return {
      id: rec.id,
      name: d.name,
      age: d.age,
      gender: d.gender,
      locality: d.locality,
      phone: phone ? maskPhone(phone) : null,
      camp: {
        eventId: d.eventId,
        title: i18n(ev?.titleEn ?? "Camp", ev?.titleHi ?? null),
        date: d.referredAt,
        samithi: org.ref(d.samithiId),
      },
      referredAt: d.referredAt,
      status: d.status,
      surgeryDate: d.surgeryDate,
      daysWaiting: waiting,
      consent: true,
      lastContactAt: d.lastContactAt,
      deleteOn: d.deleteOn,
      version: rec.version,
    };
  }

  async function history(id: string): Promise<FollowUpLogEntry[]> {
    const logs = await repo.m6.docList<LogData>("followup_log", { k1: id, order: "desc" });
    return logs.map((l) => ({ at: l.data.at, by: l.data.by, kind: l.data.kind, text: l.data.text }));
  }

  async function log(actor: Actor, id: string, kind: FollowUpLogEntry["kind"], text: string) {
    await repo.m6.docInsert<LogData>("followup_log", { id: newId(), k1: id, data: { personId: id, at: toIso(deps.now()), by: actor.name, kind, text } });
  }

  async function detail(rec: DocRec<FollowUpData>): Promise<FollowUpDetail> {
    const org = await loadOrg(repo);
    return { ...(await row(rec, org, new Map())), history: await history(rec.id) };
  }

  async function save(actor: Actor, rec: DocRec<FollowUpData>, data: FollowUpData, expect: number, action: string, extra: Record<string, unknown> = {}) {
    data.updatedAtIso = toIso(deps.now());
    const res = await repo.m6.docUpdate<FollowUpData>("followup_person", { id: rec.id, k1: data.eventId, k2: data.status, data }, expect, [
      auditRec(actor, { action, entity: "followup_person", entityId: rec.id, scopeId: data.samithiId, data: extra }),
    ]);
    if (!res.ok) throw new ApiError("CONFLICT");
    return load(rec.id);
  }

  return {
    async list(actor, q) {
      guard(actor, "followup.read");
      const org = await loadOrg(repo);
      const status = q.status ?? "open";
      const needle = q.q?.trim().toLowerCase();
      const recs = (await repo.m6.docList<FollowUpData>("followup_person", { order: "asc" }))
        .filter((r) => (status === "all" ? true : status === "open" ? OPEN.includes(r.data.status) : r.data.status === status))
        .filter((r) => !q.event || r.data.eventId === q.event)
        .filter((r) => !needle || r.data.name.toLowerCase().includes(needle) || (r.data.locality ?? "").toLowerCase().includes(needle));
      const events = new Map<string, EventRec | null>();
      let rows = await Promise.all(recs.map((r) => row(r, org, events)));
      if (q.waitingMin !== undefined) rows = rows.filter((r) => r.daysWaiting >= q.waitingMin!);
      rows.sort((a, b) => b.daysWaiting - a.daysWaiting || a.name.localeCompare(b.name));
      const page = pageOf(rows, q.page, q.pageSize);
      // Names were read: one audit row per list view (ids only, never the names).
      await repo.portal.insertAudit(
        auditRec(actor, { action: "followup.list", entity: "followup_person", entityId: null, data: { count: page.data.length, status, event: q.event ?? null } }),
      );
      return page;
    },

    async get(actor, id) {
      guard(actor, "followup.read");
      const rec = await load(id);
      await repo.portal.insertAudit(auditRec(actor, { action: "followup.view", entity: "followup_person", entityId: id, scopeId: rec.data.samithiId }));
      await log(actor, id, "viewed", "Opened");
      return detail(rec);
    },

    async revealPhone(actor, id) {
      guard(actor, "followup.reveal");
      const rec = await load(id);
      const phone = rec.data.phoneEnc ? decryptField(deps.secret, rec.data.phoneEnc) : null;
      if (!phone) throw new ApiError("NOT_FOUND");
      await repo.portal.insertAudit(auditRec(actor, { action: "followup.reveal", entity: "followup_person", entityId: id, scopeId: rec.data.samithiId }));
      await log(actor, id, "revealed", "Phone number revealed");
      return { phone };
    },

    async patch(actor, id, body) {
      guard(actor, "followup.read");
      const rec = await load(id);
      if (rec.version !== body.version) throw new ApiError("CONFLICT");
      const d: FollowUpData = { ...rec.data };
      const notes: string[] = [];
      if (body.status && body.status !== d.status) {
        notes.push(`Status: ${d.status} → ${body.status}`);
        d.status = body.status;
      }
      if (body.surgeryDate !== undefined) d.surgeryDate = body.surgeryDate;
      if (d.status === "done" && !d.surgeryDate) d.surgeryDate = istDate(deps.now());
      d.deleteOn = followUpDeleteOn(d, istDate(deps.now()));
      const out = await save(actor, rec, d, body.version, "followup.update", { status: d.status, surgeryDate: d.surgeryDate });
      if (notes.length) await log(actor, id, "status", notes.join("; "));
      if (body.note) await log(actor, id, "note", body.note);
      return detail(out);
    },

    async call(actor, id, body) {
      guard(actor, "followup.read");
      const rec = await load(id);
      if (rec.version !== body.version) throw new ApiError("CONFLICT");
      const d: FollowUpData = { ...rec.data, lastContactAt: toIso(deps.now()) };
      if (body.outcome === "wrong_number" && d.status === "referred") d.status = "unreachable";
      d.deleteOn = followUpDeleteOn(d);
      const out = await save(actor, rec, d, body.version, "followup.call", { outcome: body.outcome });
      const mins = body.minutes ? `, ${body.minutes} min` : "";
      await log(actor, id, "call", `${body.outcome.replace("_", " ")}${mins}${body.note ? `: ${body.note}` : ""}`);
      return detail(out);
    },
  };
}
