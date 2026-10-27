// Scores an EventExtract against an eval case's expectation (tests/evals).
// Text is compared on lowercase words (punctuation and spacing ignored),
// lists as sets, phones by digits.
import type { EventExtract } from "@/contract";
import { normaliseText } from "../rules";
import { flat, phoneDigits } from "./normalise";

export interface EvalExpect {
  kind: EventExtract["kind"];
  sevaType: EventExtract["sevaType"];
  title: string | null;
  /** Known samithi slug, `{raw}` for an unknown one, or null. */
  samithi: string | { raw: string } | null;
  date: string | null;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  recurrenceWeekday: number | null;
  venueName: string | null;
  venueAddress: string | null;
  partner: string | null;
  topic: string | null;
  audience: string | null;
  services: string[];
  bring: string[];
  volunteersNeeded: number | null;
  target: { count: number; unit: string } | null;
  contactName: string | null;
  contactPhone: string | null;
  sevadalNote: string | null;
}

export interface EvalCase {
  id: string;
  /** IST day the message was sent; "now" for the extractor. */
  sentAt: string;
  tags: string[];
  text: string;
  expect: EvalExpect;
}

export type ScoreKey = keyof EvalExpect;
export const SCORE_KEYS = [
  "kind", "sevaType", "title", "samithi", "date", "endDate", "startTime", "endTime", "recurrenceWeekday", "venueName", "venueAddress",
  "partner", "topic", "audience", "services", "bring", "volunteersNeeded", "target", "contactName", "contactPhone", "sevadalNote",
] as const satisfies readonly ScoreKey[];

/** ok: right value; none: rightly empty; miss: empty but expected; extra: invented; wrong: both set, different. */
export type Outcome = "ok" | "none" | "miss" | "extra" | "wrong";

const empty = (v: unknown) => v === null || v === undefined || (Array.isArray(v) && v.length === 0);
const words = (s: string) => flat(s);
const setOf = (xs: readonly string[]) => [...new Set(xs.map(words))].sort().join("|");

/** The extract seen through the eval's flattened keys. */
export function view(r: EventExtract): Record<ScoreKey, unknown> {
  return {
    kind: r.kind,
    sevaType: r.sevaType,
    title: r.title,
    samithi: r.samithi ? (r.samithi.slug ?? { raw: r.samithi.raw }) : null,
    date: r.date,
    endDate: r.endDate,
    startTime: r.startTime,
    endTime: r.endTime,
    recurrenceWeekday: r.recurrence?.weekday ?? null,
    venueName: r.venueName,
    venueAddress: r.venueAddress,
    partner: r.partner,
    topic: r.topic,
    audience: r.audience,
    services: r.services,
    bring: r.bring,
    volunteersNeeded: r.volunteersNeeded,
    target: r.target,
    contactName: r.contact?.name ?? null,
    contactPhone: r.contact?.phone ?? null,
    sevadalNote: r.sevadalNote,
  };
}

function same(key: ScoreKey, got: unknown, want: unknown): boolean {
  if (key === "services" || key === "bring") return setOf(got as string[]) === setOf(want as string[]);
  if (key === "contactPhone") return phoneDigits(normaliseText(String(got))) === phoneDigits(normaliseText(String(want)));
  if (key === "target") {
    const g = got as EvalExpect["target"];
    const w = want as EvalExpect["target"];
    return g!.count === w!.count && words(g!.unit) === words(w!.unit);
  }
  if (key === "samithi" && typeof want === "object" && want) return typeof got === "object" && got !== null && words((got as { raw: string }).raw) === words((want as { raw: string }).raw);
  if (typeof want === "string" && typeof got === "string") return key === "kind" || key === "sevaType" || /Date|Time/.test(key) ? got === want : words(got) === words(want);
  return got === want;
}

export function scoreCase(r: EventExtract, want: EvalExpect): Record<ScoreKey, { outcome: Outcome; got: unknown; want: unknown }> {
  const got = view(r);
  return Object.fromEntries(
    SCORE_KEYS.map((k) => {
      const g = got[k];
      const w = want[k];
      // `kind` is never empty: "other" plays the empty value.
      const outcome: Outcome =
        empty(g) && empty(w) ? "none" : empty(w) ? "extra" : empty(g) ? "miss" : same(k, g, w) ? (k === "kind" && w === "other" ? "none" : "ok") : "wrong";
      return [k, { outcome, got: g, want: w }];
    }),
  ) as Record<ScoreKey, { outcome: Outcome; got: unknown; want: unknown }>;
}

export interface Totals {
  cases: number;
  /** Fields right (value or rightly empty) / all fields. */
  accuracy: number;
  /** Invented values / fields that should be empty. */
  hallucination: number;
  /** Missed / fields that have a value. */
  missRate: number;
  wrong: number;
  perfectCases: number;
  byField: Record<ScoreKey, Record<Outcome, number>>;
}

export function totals(scores: ReturnType<typeof scoreCase>[]): Totals {
  const byField = Object.fromEntries(SCORE_KEYS.map((k) => [k, { ok: 0, none: 0, miss: 0, extra: 0, wrong: 0 }])) as Totals["byField"];
  let perfectCases = 0;
  for (const s of scores) {
    let perfect = true;
    for (const k of SCORE_KEYS) {
      byField[k][s[k].outcome] += 1;
      if (s[k].outcome !== "ok" && s[k].outcome !== "none") perfect = false;
    }
    if (perfect) perfectCases += 1;
  }
  const sum = (o: Outcome) => SCORE_KEYS.reduce((n, k) => n + byField[k][o], 0);
  const all = scores.length * SCORE_KEYS.length;
  return {
    cases: scores.length,
    accuracy: (sum("ok") + sum("none")) / all,
    hallucination: sum("extra") / Math.max(1, sum("none") + sum("extra")),
    missRate: sum("miss") / Math.max(1, sum("ok") + sum("miss") + sum("wrong")),
    wrong: sum("wrong"),
    perfectCases,
    byField,
  };
}
