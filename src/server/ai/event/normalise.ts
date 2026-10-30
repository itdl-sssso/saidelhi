// Normalisers shared by the rules and the model merge: whatever reads a value
// (regex or LLM), it reaches the draft only through these. English, Hinglish
// and Devanagari.
import type { SevaType } from "@/contract";
import { SevaType as SevaTypeEnum } from "@/contract";
import units from "../../data/sssso-units.json";
import { addDays, istDate } from "../../domain/time";
import { detectDate, detectSevaType, normaliseText } from "../rules";

export const pad = (n: number) => String(n).padStart(2, "0");

/** Trim, collapse spaces, drop leading labels/dashes and trailing punctuation. */
export const clean = (s: string) => s.replace(/\s+/g, " ").replace(/^[\s:.\-–•*]+|[\s.,;:!*]+$/g, "").trim();

/** Lowercase ASCII + Devanagari words only, single-spaced: for "is this value in the message?" checks. */
export const flat = (s: string) => normaliseText(s).replace(/[^a-z0-9ऀ-ॿ]+/g, " ").trim();

// Devanagari letters are not \w, so \b fails around them: use explicit edges.
const L = "(?<![a-z\\u0900-\\u097f])";
const R = "(?![a-z\\u0900-\\u097f])";

// ---------------------------------------------------------------- time

const EVENING = new RegExp(`${L}(shaam|sham|evening|raat|night|शाम|रात)${R}`);
const MORNING = new RegExp(`${L}(subah|morning|सुबह|प्रातः)${R}`);
const NOON = new RegExp(`${L}(noon|dopahar|दोपहर)${R}`);

/** "6.00 p.m.", "6:30pm", "18:00", "6 pm", "shaam 6 baje", "शाम ६ बजे", "12 noon" → "HH:MM" (24 h). */
export function parseTime(raw: string): string | null {
  const t = normaliseText(raw).replace(/\s+/g, " ");
  if (/\b12\s*(noon|dopahar)\b/.test(t)) return "12:00";
  if (/\b12\s*(midnight)\b/.test(t)) return "00:00";
  for (const m of t.matchAll(/(?<![\d.:/])(\d{1,2})(?:\s*[:.]\s*(\d{2}))?\s*(a\.?\s?m\b\.?|p\.?\s?m\b\.?|baje|बजे|hrs|hours)?(?![\d/])/g)) {
    let h = Number(m[1]);
    const min = m[2] ? Number(m[2]) : 0;
    const mer = m[3]?.replace(/[\s.]/g, "") ?? "";
    if ((!m[2] && !mer) || min > 59 || h > 23) continue; // a bare number is not a time
    const pm = mer.startsWith("p") || (!mer.startsWith("a") && (EVENING.test(t) || (NOON.test(t) && h < 6)));
    if (pm && h < 12) h += 12;
    else if (mer.startsWith("a") && h === 12) h = 0;
    else if (!mer && !m[2] && MORNING.test(t) && h === 12) h = 0;
    return `${pad(h)}:${pad(min)}`;
  }
  return null;
}

/** "6.00 p.m. to 7.00 p.m", "6-7 pm", "10:00 AM – 1 PM", "9 am onwards" → start/end. */
export function parseTimeRange(raw: string): { start: string | null; end: string | null } {
  const [a = "", b] = raw.split(/\s+(?:to|till|until|se|tak|से|तक)\s+|\s*[-–—]\s*(?=\d)/i);
  const end = b ? parseTime(b) : null;
  let start = parseTime(a);
  // "6 - 7 pm", "6:00 - 7:00 pm", "शाम 6 से 7 बजे": the meridiem is written once, after the end.
  const mer = b ? /\b([ap])\.?\s?m\b/i.exec(b)?.[1] : undefined;
  if (b && !/\b[ap]\.?\s?m\b/i.test(a)) {
    const shared = mer ? parseTime(`${a} ${mer}m`) : end && /^\s*\d{1,2}([:.]\d{2})?\s*$/.test(a) ? parseTime(`${a} ${end >= "12:00" ? "pm" : "am"}`) : null;
    if (shared && end && shared <= end) start = shared;
    else if (!start && shared) start = shared;
  }
  if (start && end && end <= start) return { start, end: null };
  return { start, end };
}

// ---------------------------------------------------------------- date

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
  जनवरी: 1, फरवरी: 2, फ़रवरी: 2, मार्च: 3, अप्रैल: 4, मई: 5, जून: 6, जुलाई: 7, अगस्त: 8, सितंबर: 9, सितम्बर: 9, अक्टूबर: 10, अक्तूबर: 10,
  नवंबर: 11, नवम्बर: 11, दिसंबर: 12, दिसम्बर: 12,
};
const MON = "(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|जनवरी|फ़?रवरी|फरवरी|मार्च|अप्रैल|मई|जून|जुलाई|अगस्त|सित[ंम]्?बर|अक्[टत]ूबर|नव[ंम]्?बर|दिस[ंम]्?बर)[a-z]*\\.?";
const monthOf = (m: string) => MONTHS[m] ?? MONTHS[m.slice(0, 3)] ?? MONTHS[m.replace("सितम्बर", "सितंबर").replace("नवम्बर", "नवंबर").replace("दिसम्बर", "दिसंबर").replace("अक्तूबर", "अक्टूबर")];

export const WEEKDAYS: Record<string, number> = {
  sunday: 0, sun: 0, ravivar: 0, itwar: 0, रविवार: 0, monday: 1, mon: 1, somvar: 1, सोमवार: 1, tuesday: 2, tue: 2, mangalvar: 2, मंगलवार: 2,
  wednesday: 3, wed: 3, budhvar: 3, बुधवार: 3, thursday: 4, thu: 4, thurs: 4, guruvar: 4, brihaspativar: 4, गुरुवार: 4, बृहस्पतिवार: 4,
  friday: 5, fri: 5, shukravar: 5, शुक्रवार: 5, saturday: 6, sat: 6, shanivar: 6, शनिवार: 6,
};
const WD = `(${Object.keys(WEEKDAYS).sort((a, b) => b.length - a.length).join("|")})`;
export const weekdayOf = (date: string) => new Date(`${date}T00:00:00Z`).getUTCDay();

function ymd(d: number, m: number, y: string | undefined, now: Date): string | null {
  if (d < 1 || d > 31 || !m) return null;
  let year = y ? (y.length === 2 ? 2000 + Number(y) : Number(y)) : Number(istDate(now).slice(0, 4));
  // No year written and the day has passed: an announcement means next year.
  if (!y && `${year}-${pad(m)}-${pad(d)}` < istDate(now)) year += 1;
  const iso = `${year}-${pad(m)}-${pad(d)}`;
  return Number.isNaN(new Date(`${iso}T00:00:00Z`).getTime()) || new Date(`${iso}T00:00:00Z`).getUTCDate() !== d ? null : iso;
}

/** All dates written in the text, in order: "24th October 2026", "Oct 24", "24/10", "२४ अक्टूबर", "24-26 Oct" (both). */
export function parseDates(raw: string, now: Date): string[] {
  const t = normaliseText(raw).replace(/\s+/g, " ");
  const found: { at: number; iso: string }[] = [];
  const push = (at: number, iso: string | null) => iso && found.push({ at, iso });
  // "24-26 Oct", "24th to 26th October 2026"
  for (const m of t.matchAll(new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s*(?:-|–|to|se|से)\\s*(\\d{1,2})(?:st|nd|rd|th)?\\s*(?:of\\s+)?${MON},?\\s*(\\d{4})?`, "g"))) {
    push(m.index, ymd(Number(m[1]), monthOf(m[3]), m[4], now));
    push(m.index + 1, ymd(Number(m[2]), monthOf(m[3]), m[4], now));
  }
  for (const m of t.matchAll(new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s*(?:of\\s+)?${MON},?\\s*(\\d{4})?`, "g"))) push(m.index, ymd(Number(m[1]), monthOf(m[2]), m[3], now));
  for (const m of t.matchAll(new RegExp(`${L}${MON}\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b,?\\s*(\\d{4})?`, "g"))) push(m.index, ymd(Number(m[2]), monthOf(m[1]), m[3], now));
  for (const m of t.matchAll(/(?<![\d.:])(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?(?![\d:])/g)) {
    // "6.00" or "10.30" next to am/pm is a time, not a date.
    if (/^\s*(a\.?m|p\.?m|baje|बजे)/.test(t.slice(m.index + m[0].length)) || (!m[3] && m[0].includes("."))) continue;
    push(m.index, ymd(Number(m[1]), Number(m[2]), m[3], now));
  }
  found.sort((a, b) => a.at - b.at);
  return [...new Set(found.map((f) => f.iso))];
}

/** First date in the text, else a relative day ("kal", "tomorrow", "this Saturday", "शनिवार"). */
export function parseDate(raw: string, now: Date): string | null {
  const written = parseDates(raw, now)[0];
  if (written) return written;
  const t = normaliseText(raw);
  const rel = detectDate(raw, now, "future")?.date ?? null;
  if (rel) return rel;
  if (/(?<![a-z])every\s|(?<![a-z])har\s|हर\s/.test(t)) return null; // "every Thursday" is a recurrence, not a date
  const wd = new RegExp(`${L}(next\\s+)?(?:this\\s+|coming\\s+|is\\s+)?${WD}${R}`).exec(t);
  if (!wd) return null;
  // The next such day, today included ("next Saturday" skips a week).
  const today = istDate(now);
  const diff = (WEEKDAYS[wd[2]] - weekdayOf(today) + 7) % 7;
  return addDays(today, diff + (wd[1] ? 7 : 0));
}

/** "every Thursday", "har guruvar", "हर गुरुवार", "weekly on Sunday" → text + weekday. */
export function parseRecurrence(raw: string): { text: string; weekday: number | null } | null {
  const t = normaliseText(raw);
  const m = new RegExp(`${L}(every|har|हर|each|weekly on|all)\\s+${WD}s?${R}`).exec(t);
  if (m) return { text: clean(raw.slice(m.index, m.index + m[0].length)) || m[0], weekday: WEEKDAYS[m[2]] };
  const w = /\b(every week|weekly|every month|monthly|daily|har hafte|har mahine|प्रति सप्ताह|हर सप्ताह)\b/.exec(t);
  return w ? { text: w[0], weekday: null } : null;
}

// ---------------------------------------------------------------- org + seva

const DISTRICT_ALIASES: [RegExp, string][] = [
  [/^(ggn|gurgaon|gurugram|gur)$/, "gurugram"],
  [/^(fbd|faridabad|far)$/, "faridabad"],
  [/^(gzb|gzd|ghaziabad|gha)$/, "ghaziabad"],
  [/^(gbn|noida|gautam ?buddh(?:a)? ?nagar)$/, "gautam-buddh-nagar"],
  [/^(central|cen)$/, "central"],
  [/^(east|eas)$/, "east"],
  [/^(north|nor)$/, "north"],
  [/^(south ?east|se|sea)$/, "south-east"],
  [/^(south ?west|sw|swe)$/, "south-west"],
  [/^(west|wes)$/, "west"],
];
const SAMITHI_BY_SLUG = new Map(units.districts.flatMap((d) => d.samithis.map((s) => [s.slug, s.name] as const)));
const SAMITHI_BY_NAME = [...units.districts.flatMap((d) => d.samithis.map((s) => [flat(s.name), s.slug] as const))]
  .filter(([n]) => n.length > 4 && !/\d$/.test(n))
  .sort((a, b) => b[0].length - a[0].length);
const SAMITHI_RE =
  /\b(ggn|gurgaon|gurugram|fbd|faridabad|gzb|gzd|ghaziabad|gbn|noida|gautam ?buddh(?:a)? ?nagar|central|south ?east|south ?west|east|north|west)\s*(?:delhi\s*)?[-#]?\s*(\d{1,2})\b(\s*(?:samithi|samiti|samiithi|समिति))?/i;

export interface SamithiHit {
  raw: string;
  slug: string | null;
  name: string | null;
  /** Written with the word "samithi" or by full name (stronger). */
  named: boolean;
}

/** "GGN 4", "Gurgaon-4 Samiti", "Greater Noida West" → known samithi (slug + name), or raw only. */
export function resolveSamithi(raw: string): SamithiHit | null {
  const m = SAMITHI_RE.exec(raw.replace(/\s+/g, " "));
  if (m) {
    const district = DISTRICT_ALIASES.find(([re]) => re.test(m[1].toLowerCase().replace(/\s+/g, " ")))?.[1];
    const slug = district ? `${district.replace(" ", "-")}-${Number(m[2])}` : null;
    const known = slug && SAMITHI_BY_SLUG.has(slug) ? slug : null;
    return { raw: `${m[1]} ${m[2]}`, slug: known, name: known ? SAMITHI_BY_SLUG.get(known)! : null, named: Boolean(m[3]) };
  }
  const t = ` ${flat(raw)} `;
  const byName = SAMITHI_BY_NAME.find(([n]) => t.includes(` ${n} `));
  if (byName) return { raw: SAMITHI_BY_SLUG.get(byName[1])!, slug: byName[1], name: SAMITHI_BY_SLUG.get(byName[1]) ?? null, named: true };
  return null;
}

const SEVA_ALIASES: Record<string, SevaType> = {
  "study circle": "study_circle",
  "bal vikas": "bal_vikas",
  balvikas: "bal_vikas",
  "narayan seva": "narayan_seva",
  "eye camp": "eye",
  "blood donation": "blood",
  "medical camp": "medical",
  "disaster relief": "disaster_relief",
};

/** Enum value, alias ("Eye camp") or a seva word → SevaType. */
export function toSevaType(v: string): SevaType | null {
  const k = v.trim().toLowerCase();
  const parsed = SevaTypeEnum.safeParse(k.replace(/[\s-]+/g, "_"));
  return parsed.success ? parsed.data : (SEVA_ALIASES[k] ?? detectSevaType(k));
}

// ---------------------------------------------------------------- phone

/** Indian mobile as written: "98100 00012", "+91-98100-00012", "9810000012", "९८१०० ०००१८". */
export const PHONE_RE = /(?:\+?91[\s-]?)?(?<![\d०-९])[6-9६-९][\d०-९]{4}[\s-]?[\d०-९]{5}(?![\d०-९])/;
export const phoneDigits = (s: string) => s.replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "");
