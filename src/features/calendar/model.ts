// Calendar URL state and grid maths. Pure: shared by the server page, the client
// filter island and unit tests. Filters live in the URL so a view can be shared.
import { type EventPublic, type SevaType, SevaType as SevaTypeSchema } from "@/contract";
import { addDaysKey, dateParts, istDateKey } from "@/lib/format";

export type CalendarView = "list" | "month";

export type CalendarState = {
  view: CalendarView;
  /** 'YYYY-MM' shown in month view. */
  month: string;
  /** Selected day in month view ('YYYY-MM-DD'), or null for the default. */
  day: string | null;
  district: string | null;
  sevaType: SevaType | null;
  samithi: string | null;
  volunteers: boolean;
  page: number;
};

export type SearchParamsRecord = Record<string, string | string[] | undefined>;

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const DAY = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Reads the URL into a calendar state; anything malformed falls back to its default. */
export function parseCalendarParams(sp: SearchParamsRecord, today: string): CalendarState {
  const view = first(sp.view) === "month" ? "month" : "list";
  const month = first(sp.month);
  const day = first(sp.day);
  const district = first(sp.district);
  const samithi = first(sp.samithi);
  const seva = SevaTypeSchema.safeParse(first(sp.sevaType));
  const page = Number.parseInt(first(sp.page) ?? "", 10);
  const validDay = day && DAY.test(day) ? day : null;
  return {
    view,
    month: month && MONTH.test(month) ? month : (validDay ?? today).slice(0, 7),
    day: validDay,
    district: district && SLUG.test(district) ? district : null,
    sevaType: seva.success ? seva.data : null,
    samithi: samithi && SLUG.test(samithi) ? samithi : null,
    volunteers: ["1", "true"].includes(first(sp.volunteers) ?? ""),
    page: Number.isFinite(page) && page > 1 ? page : 1,
  };
}

/** Builds the query string for a state, omitting defaults so URLs stay short. */
export function calendarQuery(state: CalendarState, today: string): Record<string, string> {
  const q: Record<string, string> = {};
  if (state.view === "month") {
    q.view = "month";
    if (state.month !== today.slice(0, 7)) q.month = state.month;
    if (state.day) q.day = state.day;
  }
  if (state.district) q.district = state.district;
  if (state.sevaType) q.sevaType = state.sevaType;
  if (state.samithi) q.samithi = state.samithi;
  if (state.volunteers) q.volunteers = "1";
  if (state.view === "list" && state.page > 1) q.page = String(state.page);
  return q;
}

export function activeFilterCount(state: Pick<CalendarState, "district" | "sevaType" | "samithi" | "volunteers">): number {
  return [state.district, state.sevaType, state.samithi, state.volunteers || null].filter(Boolean).length;
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const idx = y * 12 + (m - 1) + delta;
  return `${Math.floor(idx / 12)}-${String((idx % 12) + 1).padStart(2, "0")}`;
}

export function monthBounds(month: string): { from: string; to: string } {
  const from = `${month}-01`;
  const to = addDaysKey(`${shiftMonth(month, 1)}-01`, -1);
  return { from, to };
}

export type GridCell = { key: string; day: number; inMonth: boolean };

/** Monday-first weeks covering the month, padded with neighbouring days. */
export function monthGrid(month: string): GridCell[] {
  const { from, to } = monthBounds(month);
  const lead = (dateParts(from).dow + 6) % 7;
  const cells: GridCell[] = [];
  let key = addDaysKey(from, -lead);
  while (cells.length < lead || key <= to || cells.length % 7 !== 0) {
    const p = dateParts(key);
    cells.push({ key, day: p.d, inMonth: key >= from && key <= to });
    key = addDaysKey(key, 1);
  }
  return cells;
}

/** Events grouped by IST calendar day, days ascending, events by start time. */
export function groupByDay(events: readonly EventPublic[]): Map<string, EventPublic[]> {
  const map = new Map<string, EventPublic[]>();
  const sorted = [...events].sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
  for (const e of sorted) {
    const k = istDateKey(e.startsAt);
    const list = map.get(k) ?? [];
    list.push(e);
    map.set(k, list);
  }
  return map;
}
