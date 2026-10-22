// Date helpers for the portal. IST throughout; strings are explicit-locale so server and client agree.
import { type AppLocale, formatDate, formatDayMonth, formatTime, istParts, monthName } from "@/lib/format";

export type { AppLocale };

export function dateFromIstParts(at: string, locale: AppLocale): { d: number; m: string } {
  const p = istParts(at);
  return { d: p.d, m: monthName(p.m, locale, "short") };
}

/** "17 Oct 2026, 5:30 PM". */
export const fmtDateTime = (at: string, locale: AppLocale): string => `${formatDate(at, locale)}, ${formatTime(at, locale)}`;

/** "17 Oct, 5:30 PM" (no year). */
export const fmtShortDateTime = (at: string, locale: AppLocale): string => `${formatDayMonth(at, locale)}, ${formatTime(at, locale)}`;

export { formatDate, formatDayMonth, formatTime };

const HOUR = 3_600_000;

/** Whole hours until an instant (negative when past). */
export const hoursUntil = (at: string, now: number): number => Math.floor((Date.parse(at) - now) / HOUR);

const z = (n: number) => String(n).padStart(2, "0");

/** 'YYYY-MM-DDTHH:mm' wall-clock IST value for <input type="datetime-local">. */
export function toLocalInput(at: string | null): string {
  if (!at) return "";
  const p = istParts(at);
  return `${p.y}-${z(p.m)}-${z(p.d)}T${z(p.hh)}:${z(p.mm)}`;
}

/** Wall-clock IST 'YYYY-MM-DDTHH:mm' → RFC 3339 with +05:30. */
export const fromLocalInput = (v: string): string => (v ? `${v}:00+05:30` : "");
