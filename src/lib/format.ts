// Date, time and text helpers for public pages. Pure and locale-explicit so server and
// client render identical strings (no ICU differences between Node and browsers).
// All calendar maths happen in India Standard Time (UTC+05:30, no DST).
import type { I18nText } from "@/contract";

export type AppLocale = "en" | "hi";

const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_EN_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const MONTHS_HI = ["जनवरी", "फ़रवरी", "मार्च", "अप्रैल", "मई", "जून", "जुलाई", "अगस्त", "सितंबर", "अक्टूबर", "नवंबर", "दिसंबर"];
const MONTHS_HI_SHORT = ["जन", "फ़र", "मार्च", "अप्रै", "मई", "जून", "जुला", "अग", "सितं", "अक्टू", "नवं", "दिसं"];
const DAYS_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAYS_EN_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAYS_HI = ["रविवार", "सोमवार", "मंगलवार", "बुधवार", "गुरुवार", "शुक्रवार", "शनिवार"];
const DAYS_HI_SHORT = ["रवि", "सोम", "मंगल", "बुध", "गुरु", "शुक्र", "शनि"];

export type IstParts = { y: number; m: number; d: number; dow: number; hh: number; mm: number };

const pad = (n: number) => String(n).padStart(2, "0");

/** IST wall-clock fields of an instant (Date or RFC 3339 string). Month is 1-based. */
export function istParts(at: Date | string): IstParts {
  const t = typeof at === "string" ? Date.parse(at) : at.getTime();
  const s = new Date(t + IST_OFFSET_MS);
  return {
    y: s.getUTCFullYear(),
    m: s.getUTCMonth() + 1,
    d: s.getUTCDate(),
    dow: s.getUTCDay(),
    hh: s.getUTCHours(),
    mm: s.getUTCMinutes(),
  };
}

/** Parts of a 'YYYY-MM-DD' calendar date (no time zone shift). */
export function dateParts(isoDate: string): IstParts {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return { y, m, d, dow, hh: 0, mm: 0 };
}

/** 'YYYY-MM-DD' of an instant in IST. */
export function istDateKey(at: Date | string): string {
  const p = istParts(at);
  return `${p.y}-${pad(p.m)}-${pad(p.d)}`;
}

export function addDaysKey(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d) + days * DAY_MS);
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

export function monthName(m: number, locale: AppLocale, style: "short" | "long" = "short"): string {
  if (locale === "hi") return style === "long" ? MONTHS_HI[m - 1] : MONTHS_HI_SHORT[m - 1];
  return style === "long" ? MONTHS_EN_LONG[m - 1] : MONTHS_EN[m - 1];
}

export function weekdayName(dow: number, locale: AppLocale, style: "short" | "long" = "long"): string {
  if (locale === "hi") return style === "long" ? DAYS_HI[dow] : DAYS_HI_SHORT[dow];
  return style === "long" ? DAYS_EN[dow] : DAYS_EN_SHORT[dow];
}

function dateFromParts(p: Pick<IstParts, "y" | "m" | "d">, locale: AppLocale): string {
  // Hindi uses the full month name ("17 अक्टूबर 2026"); English the short one ("17 Oct 2026").
  return `${p.d} ${monthName(p.m, locale, locale === "hi" ? "long" : "short")} ${p.y}`;
}

/** "17 Oct 2026" / "17 अक्टूबर 2026" for an instant. */
export function formatDate(at: Date | string, locale: AppLocale): string {
  return dateFromParts(istParts(at), locale);
}

/** "17 Oct 2026" for a 'YYYY-MM-DD' calendar date. */
export function formatIsoDate(isoDate: string, locale: AppLocale): string {
  return dateFromParts(dateParts(isoDate), locale);
}

/** "Saturday, 17 Oct 2026". */
export function formatDateLong(at: Date | string, locale: AppLocale): string {
  const p = istParts(at);
  return `${weekdayName(p.dow, locale)}, ${dateFromParts(p, locale)}`;
}

/** "17 Oct" without the year, for compact lists. */
export function formatDayMonth(at: Date | string, locale: AppLocale): string {
  const p = istParts(at);
  return `${p.d} ${monthName(p.m, locale)}`;
}

/** Hindi time-of-day word used before the clock time ("शाम 5:30"). */
function hindiPeriod(hh: number): string {
  if (hh >= 4 && hh < 12) return "सुबह";
  if (hh >= 12 && hh < 16) return "दोपहर";
  if (hh >= 16 && hh < 20) return "शाम";
  return "रात";
}

function clock(hh: number, mm: number, locale: AppLocale): string {
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  if (locale === "hi") return `${hindiPeriod(hh)} ${h12}:${pad(mm)}`;
  return `${h12}:${pad(mm)} ${hh < 12 ? "AM" : "PM"}`;
}

/** "5:30 PM" / "शाम 5:30" for an instant, or for an 'HH:mm' IST wall-clock time. */
export function formatTime(at: Date | string, locale: AppLocale): string {
  if (typeof at === "string" && /^\d{2}:\d{2}$/.test(at)) {
    const [hh, mm] = at.split(":").map(Number);
    return clock(hh, mm, locale);
  }
  const p = istParts(at);
  return clock(p.hh, p.mm, locale);
}

/** "9:00 AM – 2:00 PM"; just the start when there is no end. */
export function formatTimeRange(start: string, end: string | null, locale: AppLocale): string {
  const a = formatTime(start, locale);
  return end ? `${a} – ${formatTime(end, locale)}` : a;
}

/** "October 2026" / "अक्टूबर 2026". */
export function formatMonthYear(y: number, m: number, locale: AppLocale): string {
  return `${monthName(m, locale, "long")} ${y}`;
}

/** "1 Jan – 22 Oct 2026", or "Up to 22 Oct 2026" when there is no start. */
export function formatPeriodRange(from: string | null, to: string, locale: AppLocale, upTo: (to: string) => string): string {
  if (!from) return upTo(formatIsoDate(to, locale));
  const a = dateParts(from);
  const b = dateParts(to);
  const left = a.y === b.y ? `${a.d} ${monthName(a.m, locale, locale === "hi" ? "long" : "short")}` : formatIsoDate(from, locale);
  return `${left} – ${formatIsoDate(to, locale)}`;
}

export type PickedText = { text: string; lang: AppLocale; fallback: boolean };

/** Chooses the reader's language from a bilingual field, falling back to English (CONTRACT §6). */
export function pickText(value: I18nText, locale: AppLocale): PickedText {
  if (locale === "hi" && value.hi && value.hi.trim()) return { text: value.hi, lang: "hi", fallback: false };
  return { text: value.en, lang: "en", fallback: locale === "hi" };
}

/** Plain string from a bilingual field, with the same fallback. */
export function tx(value: I18nText, locale: AppLocale): string {
  return pickText(value, locale).text;
}

/** Minutes between two instants, for "duration" lines. */
export function durationMinutes(start: string, end: string | null): number | null {
  if (!end) return null;
  const mins = Math.round((Date.parse(end) - Date.parse(start)) / 60000);
  return mins > 0 ? mins : null;
}

/** Google Maps search link for a venue (external). Uses coordinates when known. */
export function mapsUrl(venue: { name: string; address: string; geo: { lat: number; lng: number } | null }): string {
  const query = venue.geo ? `${venue.geo.lat},${venue.geo.lng}` : [venue.name, venue.address].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
