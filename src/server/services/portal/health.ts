// Data health (spec 45): is reporting keeping up? Internal figures, no small-number
// suppression. Every row links to where it can be fixed.
import type { HealthPayload, HealthQuery, HealthTile, ScopeRef, Source, UploadRejectReason } from "@/contract";
import { type Actor, assertCan, assertInScope } from "../../auth/rbac";
import { effectiveStatus } from "../../domain/event-lifecycle";
import { istDate, istDayStart, istMonth, monthsEnding } from "../../domain/time";
import { ApiError } from "../../http/errors";
import type { EventRec } from "../../repo/types";
import type { OrgIndex } from "../org-index";
import { DAY_MS, loadOrg, type PortalCtx } from "./shared";

export interface HealthService {
  get(actor: Actor, q: HealthQuery): Promise<HealthPayload>;
}

const HELD: ReadonlySet<string> = new Set(["planned", "awaiting_report", "report_submitted", "approved"]);
const FINISHED: ReadonlySet<string> = new Set(["awaiting_report", "report_submitted", "approved"]);
const REPORTED: ReadonlySet<string> = new Set(["report_submitted", "approved"]);
const ON_TIME_DAYS = 7;

const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round(((s[m - 1] + s[m]) / 2) * 10) / 10;
};
const pct = (n: number, d: number) => (d ? Math.round((100 * n) / d) : null);
function addMonths(month: string, by: number): string {
  const [y, m] = month.split("-").map(Number);
  const t = y * 12 + (m - 1) + by;
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, "0")}`;
}
const monthsBetween = (from: string, to: string) => {
  const out: string[] = [];
  for (let m = from; m <= to && out.length < 24; m = addMonths(m, 1)) out.push(m);
  return out;
};

export function createHealthService(ctx: PortalCtx): HealthService {
  const { repo, deps } = ctx;

  interface Reported {
    ev: EventRec;
    /** Days from event end to the report; null = not reported yet. */
    lag: number | null;
    onTime: boolean;
    counted: boolean;
  }

  async function events(org: OrgIndex, scopeId: string, months: string[]) {
    const kind = org.get(scopeId)?.kind;
    const samithiIds = kind === "ncr" ? undefined : (await repo.portal.descendantIds(scopeId)).filter((id) => org.get(id)?.kind === "samithi");
    const from = istDayStart(`${months[0]}-01`);
    const to = istDayStart(`${addMonths(months[months.length - 1], 1)}-01`);
    const { rows } = await repo.portal.listAdminEvents({ samithiIds, statuses: ["planned", "awaiting_report", "report_submitted", "approved", "escalated"], from, to, sort: "startsAt", limit: 50_000, offset: 0 });
    return rows.filter((e) => HELD.has(effectiveStatus(e)));
  }

  async function analyse(list: readonly EventRec[]): Promise<Reported[]> {
    const now = deps.now().getTime();
    const finished = list.filter((e) => FINISHED.has(effectiveStatus(e)) && (e.endsAt ?? e.startsAt).getTime() < now);
    const timeline = finished.length ? await repo.portal.timelineFor(finished.map((e) => e.id)) : [];
    const submitted = new Map<string, number>();
    for (const t of timeline) {
      if (t.status !== "report_submitted" || !t.at) continue;
      const cur = submitted.get(t.eventId);
      if (cur === undefined || t.at.getTime() < cur) submitted.set(t.eventId, t.at.getTime());
    }
    return finished.map((ev) => {
      const endDay = istDayStart(istDate(ev.endsAt ?? ev.startsAt)).getTime();
      const at = submitted.get(ev.id);
      const reported = REPORTED.has(effectiveStatus(ev));
      const lag = reported && at !== undefined ? Math.max(0, Math.floor((at - endDay) / DAY_MS)) : null;
      const onTime = lag !== null && lag <= ON_TIME_DAYS;
      // Still inside the 7-day window and not reported: not a miss yet.
      const counted = onTime || reported || now - endDay >= (ON_TIME_DAYS + 1) * DAY_MS;
      return { ev, lag, onTime, counted };
    });
  }

  const href = (org: OrgIndex, unitId: string, extra = "status=awaiting_report") => `/admin/events?${org.get(unitId)?.kind === "district" ? "district" : "samithi"}=${unitId}&${extra}`;

  return {
    async get(actor, q) {
      assertCan(actor, "health.read");
      const org = await loadOrg(repo);
      const scopeId = q.scope ?? actor.scopeId ?? "";
      if (!org.get(scopeId)) throw new ApiError("NOT_FOUND");
      if (!(actor.all && org.get(scopeId)?.kind === "ncr")) assertInScope(actor, scopeId);
      const now = deps.now();
      const last = q.to ?? istMonth(now);
      const months = q.from ? monthsBetween(q.from, last) : monthsEnding(last, 6);
      if (!months.length) throw new ApiError("VALIDATION_FAILED", { fields: { from: "Start month is after the end month." } });

      const unit = org.get(scopeId)!;
      const scope: ScopeRef = { ...org.ref(scopeId), kind: unit.kind };
      const rowUnits = unit.kind === "ncr" ? org.districts() : unit.kind === "district" ? org.samithisOf(scopeId) : [unit];
      const unitOf = (e: EventRec) => (unit.kind === "ncr" ? e.districtId : e.samithiId);

      const list = await events(org, scopeId, months);
      const analysed = await analyse(list);

      // Previous period of the same length, for the tile deltas.
      const prevMonths = months.map((m) => addMonths(m, -months.length));
      const prevAnalysed = await analyse(await events(org, scopeId, prevMonths));
      const stats = (a: Reported[]) => {
        const counted = a.filter((r) => r.counted);
        return { onTime: pct(counted.filter((r) => r.onTime).length, counted.length), lag: a.some((r) => r.lag !== null) ? median(a.flatMap((r) => (r.lag === null ? [] : [r.lag]))) : null };
      };
      const cur = stats(analysed);
      const prev = stats(prevAnalysed);
      const delta = (a: number | null, b: number | null) => (a === null || b === null ? null : Math.round((a - b) * 10) / 10);

      const facts = list.length ? await repo.portal.factsForEvents(list.map((e) => e.id)) : [];
      const totals = facts.filter((f) => f.dim === "" && f.value !== null);
      const estimated = totals.filter((f) => f.estimate).length;
      const estimateShare = { pct: pct(estimated, totals.length) ?? 0, estimated, total: totals.length };

      const under = unit.kind === "ncr" ? null : new Set(await repo.portal.descendantIds(scopeId));
      const inScopeEvents = new Map<string, EventRec>();
      const pendingAll = (await repo.portal.approvals({ states: ["pending", "escalated"] }));
      for (const a of pendingAll) {
        const ev = await repo.eventById(a.eventId);
        if (ev && (!under || under.has(ev.samithiId))) inScopeEvents.set(a.id, ev);
      }
      pendingAll.splice(0, pendingAll.length, ...pendingAll.filter((a) => inScopeEvents.has(a.id)));
      const waitingNow = pendingAll.length;

      const tiles: HealthTile[] = [
        { key: "on_time_rate", label: { en: "Reports on time", hi: "समय पर रिपोर्ट" }, value: cur.onTime, unit: "pct", delta: delta(cur.onTime, prev.onTime), note: { en: "Report within 7 days of the event", hi: "कार्यक्रम के 7 दिन के भीतर रिपोर्ट" } },
        { key: "event_to_report_days", label: { en: "Days to report", hi: "रिपोर्ट में लगे दिन" }, value: cur.lag, unit: "days", delta: delta(cur.lag, prev.lag), note: { en: "Median, event to report", hi: "कार्यक्रम से रिपोर्ट तक, माध्यिका" } },
        { key: "waiting_approval", label: { en: "Waiting for approval", hi: "स्वीकृति की प्रतीक्षा में" }, value: waitingNow, unit: "count", delta: null, note: null },
        { key: "estimate_share", label: { en: "Estimated figures", hi: "अनुमानित आँकड़े" }, value: estimateShare.total ? estimateShare.pct : null, unit: "pct", delta: null, note: null },
      ];

      const reportingRate = rowUnits.map((u) => ({
        unit: org.ref(u.id),
        active: u.active,
        href: href(org, u.id),
        cells: months.map((m) => {
          const mine = analysed.filter((r) => unitOf(r.ev) === u.id && istMonth(r.ev.startsAt) === m && r.counted);
          return pct(mine.filter((r) => r.onTime).length, mine.length);
        }),
      }));

      const pendingApprovals = rowUnits.flatMap((u) => {
        const mine = pendingAll.filter((a) => unitOf(inScopeEvents.get(a.id)!) === u.id);
        if (!mine.length) return [];
        const oldest = Math.max(...mine.map((a) => Math.max(0, Math.floor((now.getTime() - a.requestedAt.getTime()) / DAY_MS))));
        const kind = mine.some((a) => a.kind === "report") ? "reports" : "plans";
        return [{ unit: org.ref(u.id), waiting: mine.length, oldestDays: oldest, href: `/admin/approvals?tab=${mine.some((a) => a.state === "escalated") ? "escalated" : kind}` }];
      });

      const reportLag = rowUnits.flatMap((u) => {
        const lags = analysed.filter((r) => unitOf(r.ev) === u.id && r.lag !== null).map((r) => r.lag as number);
        return lags.length ? [{ unit: org.ref(u.id), medianDays: median(lags), slowestDays: Math.max(...lags), href: href(org, u.id, "status=report_submitted") }] : [];
      });

      // Uploads in the window and in scope.
      const windowFrom = istDayStart(`${months[0]}-01`).getTime();
      const windowTo = istDayStart(`${addMonths(months[months.length - 1], 1)}-01`).getTime();
      const scopeIds = under;
      const batches = (await repo.m6.docList<{ uploadedAt: string; samithiId: string | null; counts: { new: number; updated: number; rejected: number } }>("upload_batch")).filter(
        (b) => Date.parse(b.data.uploadedAt) >= windowFrom && Date.parse(b.data.uploadedAt) < windowTo && (!scopeIds || (b.data.samithiId !== null && scopeIds.has(b.data.samithiId))),
      );
      const reasons = new Map<UploadRejectReason, number>();
      for (const b of batches) {
        for (const r of await repo.m6.docList<{ action: string; issues: { level: string; reason: UploadRejectReason }[] }>("upload_row", { k1: b.id })) {
          if (r.data.action !== "reject") continue;
          const reason = r.data.issues.find((i) => i.level === "error")?.reason ?? "other";
          reasons.set(reason, (reasons.get(reason) ?? 0) + 1);
        }
      }

      const bySource = new Map<Source, number>();
      for (const e of list) bySource.set(e.source, (bySource.get(e.source) ?? 0) + 1);

      return {
        scope,
        months,
        tiles,
        reportingRate,
        pendingApprovals,
        reportLag,
        uploads: {
          batches: batches.length,
          rowsLoaded: batches.reduce((n, b) => n + (b.data.counts.new ?? 0) + (b.data.counts.updated ?? 0), 0),
          rowsRejected: batches.reduce((n, b) => n + (b.data.counts.rejected ?? 0), 0),
          rejectsByReason: [...reasons.entries()].map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count),
        },
        channelMix: [...bySource.entries()].map(([source, count]) => ({ source, count, pct: Math.round((1000 * count) / list.length) / 10 })).sort((a, b) => b.count - a.count),
        estimateShare,
      };
    },
  };
}
