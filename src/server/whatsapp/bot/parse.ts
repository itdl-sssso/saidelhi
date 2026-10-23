// Small parsers for what people type in chat (English, Hindi digits, Hinglish).
import { detectDate, normaliseText } from "../../ai/rules";
import { istDate } from "../../domain/time";

/** Whole number only ("120", "१२०", "1,200"); anything else is null. */
export function parseWholeNumber(text: string | null): number | null {
  if (!text) return null;
  const s = normaliseText(text).trim();
  return /^\d{1,9}$/.test(s) ? Number(s) : null;
}

/**
 * A date today or later. Accepts "today", "tomorrow", "aaj", "kal", "25 oct",
 * "25/10". Returns a reason when it cannot be used.
 */
export function parseFutureDate(text: string | null, now: Date): { date: string } | { error: "format" | "past" } {
  if (!text) return { error: "format" };
  const hit = detectDate(text, now, "future");
  if (!hit) return { error: "format" };
  // A bare day/month that already passed this year means next year's.
  let date = hit.date;
  const today = istDate(now);
  if (date < today && /\b\d{1,2}[\s/.-]/.test(normaliseText(text)) && !/\b20\d{2}\b/.test(text)) {
    const [, m, d] = date.split("-");
    const next = `${Number(today.slice(0, 4)) + 1}-${m}-${d}`;
    if (next > today && Date.parse(`${next}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`) < 200 * 86_400_000) date = next;
  }
  return date < today ? { error: "past" } : { date };
}

const PM_WORDS = /\b(pm|shaam|sham|evening|raat|night|dopahar|dophar|afternoon)\b/;
const AM_WORDS = /\b(am|subah|morning|savere)\b/;

/**
 * Clock time as 'HH:mm'. "5pm", "5:30 pm", "17:30", "9 baje", "shaam 5 baje".
 * With no am/pm, 1–6 is read as afternoon (events rarely start at 3 am).
 */
export function parseTime(text: string | null): string | null {
  if (!text) return null;
  const s = normaliseText(text).trim();
  const m = /(\d{1,2})(?:[:.](\d{2}))?/.exec(s);
  if (!m) return null;
  let h = Number(m[1]);
  const min = m[2] ? Number(m[2]) : 0;
  if (min > 59 || h > 23) return null;
  if (PM_WORDS.test(s) && h < 12) h += 12;
  else if (AM_WORDS.test(s) && h === 12) h = 0;
  else if (!PM_WORDS.test(s) && !AM_WORDS.test(s) && h >= 1 && h <= 6) h += 12;
  if (h > 23) return null;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

/** Lowercase letters/digits only, for matching names. */
export const fold = (s: string) => s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9ऀ-ॿ]+/g, " ").trim();

/** Normalised words of a user message (for keyword commands). */
export const words = (s: string | null) => fold(s ?? "").split(" ").filter(Boolean);

export const SKIP_WORDS = ["skip", "no", "none", "na", "n/a", "-", "छोड़ें", "नहीं", "nahi", "nahin", "chhodo"];
export const isSkip = (text: string | null) => !!text && SKIP_WORDS.includes(text.trim().toLowerCase());
