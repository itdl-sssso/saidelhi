// Overview (spec 24): what needs me today, then how my area is doing this month.
import type { I18nText, KpiTile, NeedItem, OverviewPayload, SevaTypeCount } from "@/contract";
import { type Actor, assertCan, assertInScope, can } from "../../auth/rbac";
import { effectiveStatus } from "../../domain/event-lifecycle";
import { SERVED_KEYS } from "../../domain/kpi";
import { istDate, istDayStart, istMonth, monthsEnding } from "../../domain/time";
import type { EventRec, KpiFactRec } from "../../repo/types";
import { i18n } from "../org-index";
import type { ApprovalsService } from "./approvals";
import { DAY_MS, loadOrg, type PortalCtx, scopeSamithiIds, toEventRow } from "./shared";

export interface OverviewService {
  get(actor: Actor, scopeId?: string): Promise<OverviewPayload>;
}

const HELD: ReadonlySet<string> = new Set(["planned", "awaiting_report", "report_submitted", "approved"]);
const REPORTED: ReadonlySet<string> = new Set(["report_submitted", "approved"]);

/** Counted as an activity: not draft/cancelled/postponed and past the approval stage. */
const isActivity = (e: EventRec) => HELD.has(effectiveStatus(e));

const monthStart = (m: string) => istDayStart(`${m}-01`);
function monthsAfter(m: string): string {
  const [y, mm] = m.split("-").map(Number);
  return mm === 12 ? `${y + 1}-01` : `${y}-${String(mm + 1).padStart(2, "0")}`;
}

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

const LABELS = {
  plans: (n: number): I18nText => ({ en: `${n} ${plural(n, "plan", "plans")} to approve`, hi: `स्वीकृति के लिए ${n} ${plural(n, "योजना", "योजनाएँ")}` }),
  reports: (n: number): I18nText => ({ en: `${n} ${plural(n, "report", "reports")} to approve`, hi: `स्वीकृति के लिए ${n} रिपोर्ट` }),
  escalations: (n: number): I18nText => ({ en: `${n} ${plural(n, "approval", "approvals")} escalated to the state team`, hi: `${n} ${plural(n, "स्वीकृति राज्य टीम को भेजी गई", "स्वीकृतियाँ राज्य टीम को भेजी गईं")}` }),
  overdue: (n: number): I18nText => ({ en: `${n} ${plural(n, "report is", "reports are")} overdue`, hi: `${n} रिपोर्ट की समय-सीमा निकल गई` }),
  awaiting: (n: number): I18nText => ({ en: `${n} ${plural(n, "event", "events")} without a report`, hi: `${n} ${plural(n, "कार्यक्रम", "कार्यक्रमों")} की रिपोर्ट बाकी` }),
  drafts: (n: number): I18nText => ({ en: `${n} ${plural(n, "draft", "drafts")} to send for approval`, hi: `स्वीकृति हेतु भेजने के लिए ${n} ड्राफ़्ट` }),
  changes: (n: number): I18nText => ({ en: `${n} ${plural(n, "plan needs", "plans need")} changes`, hi: `${n} ${plural(n, "योजना", "योजनाओं")} में बदलाव चाहिए` }),
};

const TILE_LABELS = {
  activities: { en: "Activities", hi: "गतिविधियाँ" },
  people_served: { en: "People served", hi: "सेवा पाने वाले लोग" },
  volunteer_hours: { en: "Volunteer hours", hi: "स्वयंसेवा घंटे" },
  reporting_rate: { en: "Reporting rate", hi: "रिपोर्टिंग दर" },
} satisfies Record<string, I18nText>;

export function createOverviewService(ctx: PortalCtx, approvals: ApprovalsService): OverviewService {
  const { repo, deps } = ctx;

  /** Narrows the actor to a unit inside their scope (state admins: any unit). */
  async function narrow(actor: Actor, scopeId: string | undefined): Promise<Actor> {
    if (!scopeId || scopeId === actor.scopeId) return actor;
    assertInScope(actor, scopeId);
    const org = await loadOrg(repo);
    if (org.get(scopeId)?.kind === "ncr") return actor;
    return { ...actor, all: false, scopeId, unitIds: new Set(await repo.portal.descendantIds(scopeId)) };
  }

  function monthFigures(events: readonly EventRec[], facts: readonly KpiFactRec[], month: string, now: Date) {
    const inMonth = events.filter((e) => istMonth(e.startsAt) === month);
    const acts = inMonth.filter(isActivity);
    const ids = new Set(acts.map((e) => e.id));
    const sum = (keys: readonly string[]) => {
      const vals = facts.filter((f) => ids.has(f.eventId) && keys.includes(f.kpiKey) && f.dim === "" && f.value !== null).map((f) => f.value as number);
      return vals.length ? vals.reduce((a, b) => a + b, 0) : null;
    };
    const past = acts.filter((e) => e.startsAt < now && effectiveStatus(e) !== "planned");
    const samithisDue = new Set(past.map((e) => e.samithiId));
    const samithisReported = new Set(past.filter((e) => REPORTED.has(effectiveStatus(e))).map((e) => e.samithiId));
    return {
      activities: acts.length,
      people_served: sum(SERVED_KEYS),
      volunteer_hours: sum(["volunteer_hours"]),
      reporting_rate: samithisDue.size ? Math.round((100 * samithisReported.size) / samithisDue.size) : null,
    };
  }

  return {
    async get(actor0, scopeId) {
      assertCan(actor0, "overview.read");
      const actor = await narrow(actor0, scopeId);
      const org = await loadOrg(repo);
      const now = deps.now();
      const today = istDate(now);
      const thisMonth = istMonth(now);
      const months = monthsEnding(thisMonth, 6);
      const samithiIds = scopeSamithiIds(actor, org);

      const [{ rows: all }, approvalCounts] = await Promise.all([
        repo.portal.listAdminEvents({ samithiIds, sort: "startsAt", limit: 100_000, offset: 0 }),
        can(actor, "approvals.read") ? approvals.list(actor, { tab: "plans", page: 1, pageSize: 1 }).then((r) => r.meta.counts) : Promise.resolve(null),
      ]);
      const windowStart = monthStart(months[0]);
      const windowEnd = monthStart(monthsAfter(thisMonth));
      const recent = all.filter((e) => e.startsAt >= windowStart && e.startsAt < windowEnd);
      const facts = await repo.portal.factsForEvents(recent.map((e) => e.id));

      const series = months.map((m) => monthFigures(recent, facts, m, now));
      const period = {
        from: `${thisMonth}-01`,
        to: today,
        label: {
          en: new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "Asia/Kolkata" }).format(now),
          hi: new Intl.DateTimeFormat("hi-IN", { month: "long", year: "numeric", timeZone: "Asia/Kolkata" }).format(now),
        },
      };
      const kpis: KpiTile[] = (["activities", "people_served", "volunteer_hours", "reporting_rate"] as const).map((key) => {
        const cur = series[series.length - 1][key];
        const prev = series[series.length - 2][key];
        const tile: KpiTile = {
          key,
          label: TILE_LABELS[key],
          figure: { value: cur, estimate: false },
          period,
          sparkline: series.map((s) => s[key] ?? 0),
          deltaPct: cur !== null && prev ? Math.round(((cur - prev) / prev) * 100) : null,
        };
        if (key === "reporting_rate") tile.note = { en: "% of samithis with past events this month that reported", hi: "इस माह के पिछले कार्यक्रमों वाली समितियों में से रिपोर्ट करने वालों का %" };
        if (key === "people_served") tile.note = { en: "Counts services given; one person may attend more than once.", hi: "यह दी गई सेवाओं की गिनती है; एक व्यक्ति एक से अधिक बार आ सकता है।" };
        return tile;
      });

      const needsYou: NeedItem[] = [];
      const push = (key: NeedItem["key"], events: readonly EventRec[] | number, label: (n: number) => I18nText, href: string) => {
        const count = typeof events === "number" ? events : events.length;
        if (count > 0) needsYou.push({ key, count, label: label(count), href, eventIds: typeof events === "number" ? [] : events.map((e) => e.id) });
      };
      if (approvalCounts && can(actor, "approvals.decide")) {
        if (can(actor, "approvals.escalated")) push("escalations", approvalCounts.escalated, LABELS.escalations, "/admin/approvals?tab=escalated");
        push("plans_to_approve", approvalCounts.plans, LABELS.plans, "/admin/approvals?tab=plans");
        push("reports_to_approve", approvalCounts.reports, LABELS.reports, "/admin/approvals?tab=reports");
      }
      const awaiting = all.filter((e) => e.status === "awaiting_report");
      const overdue = awaiting.filter((e) => e.reportDueAt && e.reportDueAt < now);
      push("reports_overdue", overdue, LABELS.overdue, "/admin/events?status=awaiting_report&overdue=true");
      push("awaiting_report", awaiting.filter((e) => !overdue.includes(e)), LABELS.awaiting, "/admin/events?status=awaiting_report");
      if (can(actor, "events.plan")) {
        const drafts = all.filter((e) => e.status === "draft");
        const returned = drafts.length
          ? new Set((await repo.portal.approvals({ states: ["changes_requested"], eventIds: drafts.map((e) => e.id), kind: "plan" })).map((a) => a.eventId))
          : new Set<string>();
        push("changes_requested", drafts.filter((e) => returned.has(e.id)), LABELS.changes, "/admin/events?status=draft");
        push("drafts", drafts.filter((e) => !returned.has(e.id)), LABELS.drafts, "/admin/events?status=draft");
      }

      const horizon = new Date(now.getTime() + 14 * DAY_MS);
      const upcoming = all
        .filter((e) => e.startsAt >= istDayStart(today) && e.startsAt < horizon && e.status !== "cancelled")
        .slice(0, 20)
        .map((e) => toEventRow(e, org, now));

      const counts = new Map<string, number>();
      for (const e of recent) if (istMonth(e.startsAt) === thisMonth && isActivity(e)) counts.set(e.sevaType, (counts.get(e.sevaType) ?? 0) + 1);
      const bySevaType: SevaTypeCount[] = [...counts.entries()]
        .map(([code, count]) => {
          const info = org.sevaType(code as EventRec["sevaType"]);
          return { sevaType: info.code, label: info.label, icon: info.icon, count };
        })
        .sort((a, b) => b.count - a.count);

      const unit = actor.scopeId ? org.get(actor.scopeId) : undefined;
      return {
        scope: unit ? { id: unit.id, slug: unit.slug, name: i18n(unit.nameEn, unit.nameHi), kind: unit.kind } : null,
        today,
        needsYou,
        kpis,
        upcoming,
        bySevaType,
        firstRun: all.length === 0,
      };
    },
  };
}
