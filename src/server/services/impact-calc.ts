// Aggregation of approved facts + visible estimates into public figures.
import type { Figure, I18nText, ImpactPeriod, KpiTile, LabelledFigure, PeriodInfo, SevaTypeImpact, TrendPoint } from "@/contract";
import {
  ACTIVITIES,
  CAMPS,
  kpiDef,
  LABELS,
  NOTES,
  PEOPLE_SERVED,
  SERVED_KEYS,
  SEVA_TYPE_CARDS,
  publicCount,
} from "../domain/kpi";
import { addDays, istDate, istDayStart, istMonth, istYear, monthsEnding } from "../domain/time";
import type { DataRepo, EstimateRec, EventRec, KpiFactRec } from "../repo/types";
import type { OrgIndex } from "./org-index";

export interface Scope {
  districtId?: string;
  samithiId?: string;
}

export interface Window {
  /** Inclusive; undefined = since the beginning. */
  from?: Date;
  /** Exclusive. */
  to: Date;
  info: PeriodInfo;
}

const MAX_EVENTS = 100_000;

export function periodWindow(period: ImpactPeriod, now: Date): Window & { trendMonths: string[] } {
  const year = istYear(now);
  const today = istDate(now);
  const end = istDayStart(addDays(today, 1));
  if (period === "last_year") {
    const y = year - 1;
    return {
      from: istDayStart(`${y}-01-01`),
      to: istDayStart(`${year}-01-01`),
      info: { from: `${y}-01-01`, to: `${y}-12-31`, label: { en: String(y), hi: String(y) } },
      trendMonths: monthsEnding(`${y}-12`, 12),
    };
  }
  if (period === "all") {
    return {
      to: end,
      info: { from: null, to: today, label: { en: "All time", hi: "अब तक" } },
      trendMonths: monthsEnding(istMonth(now), 12),
    };
  }
  return {
    from: istDayStart(`${year}-01-01`),
    to: end,
    info: { from: `${year}-01-01`, to: today, label: { en: `${year} so far`, hi: `${year} में अब तक` } },
    trendMonths: monthsEnding(istMonth(now), 12),
  };
}

/** Everything needed to compute public figures for one scope and window. */
export interface ImpactData {
  events: EventRec[];
  facts: (KpiFactRec & { event: EventRec })[];
  estimates: EstimateRec[];
}

export async function loadImpactData(
  repo: DataRepo,
  org: OrgIndex,
  scope: Scope,
  window: { from?: Date; to: Date },
  showEstimates: boolean,
): Promise<ImpactData> {
  const { rows: events } = await repo.listEvents({
    statuses: ["approved"],
    from: window.from,
    to: window.to,
    districtId: scope.districtId,
    samithiId: scope.samithiId,
    order: "desc",
    limit: MAX_EVENTS,
    offset: 0,
  });
  const facts = events.length ? await repo.approvedFacts({ eventIds: events.map((e) => e.id) }) : [];
  let estimates: EstimateRec[] = [];
  if (showEstimates) {
    const all = await repo.estimates({
      fromMonth: window.from ? `${istMonth(window.from)}-01` : undefined,
      toMonth: `${istMonth(new Date(window.to.getTime() - 1))}-01`,
    });
    estimates = all.filter((e) => e.visible && inScope(org, e.orgUnitId, scope));
  }
  return { events, facts, estimates };
}

function inScope(org: OrgIndex, unitId: string, scope: Scope): boolean {
  if (scope.samithiId) return unitId === scope.samithiId;
  if (scope.districtId) return org.districtIdOf(unitId) === scope.districtId;
  return true;
}

export function filterData(data: ImpactData, pred: (e: EventRec) => boolean, estPred: (e: EstimateRec) => boolean): ImpactData {
  const events = data.events.filter(pred);
  const ids = new Set(events.map((e) => e.id));
  return { events, facts: data.facts.filter((f) => ids.has(f.eventId)), estimates: data.estimates.filter(estPred) };
}

/** Figure for a KPI key (or the synthetic activities/camps/people_served keys). */
export function figureFor(data: ImpactData, key: string): Figure {
  const estKeys = key === PEOPLE_SERVED ? [PEOPLE_SERVED, ...SERVED_KEYS] : [key];
  const est = data.estimates.filter((e) => estKeys.includes(e.kpiKey)).reduce((a, e) => a + e.value, 0);
  const hasEst = data.estimates.some((e) => estKeys.includes(e.kpiKey));

  if (key === ACTIVITIES || key === CAMPS) {
    return { value: data.events.length + est, estimate: hasEst };
  }

  const factKeys = key === PEOPLE_SERVED ? SERVED_KEYS : [key];
  const reported = data.facts
    .filter((f) => factKeys.includes(f.kpiKey) && f.dim === "" && f.value !== null)
    .map((f) => f.value as number);
  const factEstimate = data.facts.some((f) => factKeys.includes(f.kpiKey) && f.estimate);
  if (reported.length === 0 && !hasEst) return { value: null, estimate: false };
  const total = reported.reduce((a, b) => a + b, 0) + est;
  const suppress = key === PEOPLE_SERVED ? true : (kpiDef(key)?.suppress ?? true);
  return { value: publicCount(total, suppress), estimate: hasEst || factEstimate };
}

export function labelFor(key: string): I18nText {
  if (key === ACTIVITIES) return LABELS.activities;
  if (key === PEOPLE_SERVED) return LABELS.peopleServed;
  if (key === CAMPS) return LABELS.camps;
  return kpiDef(key)?.label ?? { en: key, hi: null };
}

export function tile(data: ImpactData, key: string, period: PeriodInfo): KpiTile {
  const t: KpiTile = { key, label: labelFor(key), figure: figureFor(data, key), period };
  if (key === PEOPLE_SERVED) t.note = NOTES.peopleServed;
  return t;
}

export function activeTile(data: ImpactData, period: PeriodInfo): KpiTile {
  const samithis = new Set(data.events.map((e) => e.samithiId));
  const districts = new Set(data.events.map((e) => e.districtId));
  return {
    key: "active",
    label: LABELS.active,
    figure: { value: samithis.size, estimate: false },
    period,
    note: { en: `across ${districts.size} districts`, hi: `${districts.size} ज़िलों में` },
  };
}

export function headlineTiles(data: ImpactData, period: PeriodInfo): KpiTile[] {
  return [tile(data, ACTIVITIES, period), tile(data, PEOPLE_SERVED, period), tile(data, "volunteer_hours", period), activeTile(data, period)];
}

export const hasAnyData = (data: ImpactData) => data.events.length > 0 || data.estimates.length > 0;

export function bySevaType(data: ImpactData, org: OrgIndex): SevaTypeImpact[] {
  return SEVA_TYPE_CARDS.map(({ sevaType, keys }) => {
    const slice = filterData(data, (e) => e.sevaType === sevaType, (e) => e.sevaType === sevaType || (e.sevaType === null && kpiDef(e.kpiKey)?.sevaType === sevaType));
    const info = org.sevaType(sevaType);
    const figures: LabelledFigure[] = keys.map((key) => ({ key, label: labelFor(key), figure: figureFor(slice, key) }));
    return { sevaType, label: info.label, icon: info.icon, figures, href: `/programs/${sevaType}` };
  });
}

export function trend(data: ImpactData, months: readonly string[]): TrendPoint[] {
  return months.map((month) => {
    const events = data.events.filter((e) => istMonth(e.startsAt) === month).length;
    const est = data.estimates.filter((e) => e.kpiKey === ACTIVITIES && e.month.startsWith(month));
    return { month, figure: { value: events + est.reduce((a, e) => a + e.value, 0), estimate: est.length > 0 } };
  });
}
