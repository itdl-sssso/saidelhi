// Calendar maths in India Standard Time (UTC+05:30, no DST).
const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** IST wall-clock fields of an instant. */
function istParts(d: Date) {
  const s = new Date(d.getTime() + IST_OFFSET_MS);
  return { y: s.getUTCFullYear(), m: s.getUTCMonth() + 1, d: s.getUTCDate(), dow: s.getUTCDay(), hh: s.getUTCHours(), mm: s.getUTCMinutes() };
}

const pad = (n: number, w = 2) => String(n).padStart(w, "0");

/** 'YYYY-MM-DD' of the instant in IST. */
export function istDate(d: Date): string {
  const p = istParts(d);
  return `${p.y}-${pad(p.m)}-${pad(p.d)}`;
}

/** 'YYYY-MM' of the instant in IST. */
export function istMonth(d: Date): string {
  return istDate(d).slice(0, 7);
}

export function istYear(d: Date): number {
  return istParts(d).y;
}

/** UTC instant of 00:00 IST on the given 'YYYY-MM-DD'. */
export function istDayStart(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d) - IST_OFFSET_MS);
}

/** UTC instant of an IST wall-clock time. */
export function istInstant(date: string, time: string): Date {
  const [hh, mm] = time.split(":").map(Number);
  return new Date(istDayStart(date).getTime() + (hh * 60 + mm) * 60 * 1000);
}

export function addDays(date: string, days: number): string {
  return istDate(new Date(istDayStart(date).getTime() + days * DAY_MS));
}

/** `count` consecutive months ending with `lastMonth` ('YYYY-MM'). */
export function monthsEnding(lastMonth: string, count: number): string[] {
  const [y, m] = lastMonth.split("-").map(Number);
  const out: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const idx = y * 12 + (m - 1) - i;
    out.push(`${Math.floor(idx / 12)}-${pad((idx % 12) + 1)}`);
  }
  return out;
}

/** Next IST occurrence of a weekly slot (day 0 = Sunday, 'HH:mm') strictly after `now`. */
export function nextWeekly(day: number, time: string, now: Date): Date {
  const today = istDate(now);
  const dow = istParts(now).dow;
  for (let i = 0; i <= 7; i++) {
    if ((dow + i) % 7 !== day) continue;
    const at = istInstant(addDays(today, i), time);
    if (at.getTime() > now.getTime()) return at;
  }
  return istInstant(addDays(today, 7), time);
}

export const toIso = (d: Date) => d.toISOString();
export const toIsoOrNull = (d: Date | null) => (d ? d.toISOString() : null);
