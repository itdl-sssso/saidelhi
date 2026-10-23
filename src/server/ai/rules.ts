// Rules-first extraction: numbers next to field keywords, dates ("aaj", "kal",
// "24 oct") and seva-type words, English and Hinglish. Deterministic and offline.
import type { SevaType } from "@/contract";
import { addDays, istDate } from "../domain/time";
import type { DateHint, EventHints, ExtractField, ExtractInput, ExtractResult, FieldConfidence } from "./types";

const DEVANAGARI_DIGITS = "०१२३४५६७८९";

/** Lowercase, ASCII digits, thousands separators removed. */
export function normaliseText(text: string): string {
  return text
    .replace(/[०-९]/g, (d) => String(DEVANAGARI_DIGITS.indexOf(d)))
    .replace(/(\d),(?=\d{3}\b)/g, "$1")
    .toLowerCase();
}

const MONTHS: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4, may: 5, jun: 6, june: 6,
  jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9, september: 9, oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
};

const pad = (n: number) => String(n).padStart(2, "0");

/** Date mentioned in the message. `tense` decides what "kal" means (yesterday in a report, tomorrow in a plan). */
export function detectDate(raw: string, now: Date, tense: "past" | "future" = "past"): DateHint | null {
  const text = normaliseText(raw);
  const today = istDate(now);
  const year = Number(today.slice(0, 4));
  const words = text.split(/[^a-zऀ-ॿ]+/).filter(Boolean);
  const has = (...w: string[]) => w.some((x) => words.includes(x));

  const iso = /\b(20\d{2})-(\d{2})-(\d{2})\b/.exec(text);
  if (iso) return { date: iso[0], why: `Date written as ${iso[0]}` };
  const dmy = /\b(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?\b/.exec(text);
  if (dmy) {
    const d = Number(dmy[1]);
    const m = Number(dmy[2]);
    if (d >= 1 && d <= 31 && m >= 1 && m <= 12) {
      const y = dmy[3] ? (dmy[3].length === 2 ? 2000 + Number(dmy[3]) : Number(dmy[3])) : year;
      return { date: `${y}-${pad(m)}-${pad(d)}`, why: `Date written as ${dmy[0]}` };
    }
  }
  const dMon = /\b(\d{1,2})(?:st|nd|rd|th)?\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\b/.exec(text);
  if (dMon) return { date: `${year}-${pad(MONTHS[dMon[2]])}-${pad(Number(dMon[1]))}`, why: `Date written as ${dMon[0]}` };

  if (has("aaj", "today", "आज")) return { date: today, why: "Message says 'aaj' (today)" };
  if (has("parso", "परसों")) return { date: addDays(today, tense === "past" ? -2 : 2), why: "Message says 'parso'" };
  if (has("yesterday")) return { date: addDays(today, -1), why: "Message says 'yesterday'" };
  if (has("tomorrow")) return { date: addDays(today, 1), why: "Message says 'tomorrow'" };
  if (has("kal", "कल")) return { date: addDays(today, tense === "past" ? -1 : 1), why: tense === "past" ? "Message says 'kal' (taken as yesterday)" : "Message says 'kal' (taken as tomorrow)" };
  return null;
}

const SEVA_WORDS: [SevaType, RegExp][] = [
  ["eye", /\b(eye|netra|chashm\w*|spectacle\w*|glasses|cataract|motiyabind\w*|नेत्र|चश्म\w*)/],
  ["blood", /\b(blood|rakt\w*|donor\w*|donation|रक्त\w*)/],
  ["medical", /\b(medical|health camp|dawai|medicine\w*|doctor\w*|चिकित्सा)/],
  ["narayan_seva", /\b(narayan|bhojan|langar|food|meal\w*|नारायण|भोजन)/],
  ["bal_vikas", /\b(bal ?vikas|balvikas|बाल ?विकास)/],
  ["bhajan", /\b(bhajan|bhajans|भजन)/],
  ["study_circle", /\b(study circle|स्टडी)/],
  ["disaster_relief", /\b(flood|baadh|disaster|relief|बाढ़)/],
  ["cleanliness", /\b(safai|cleanliness|clean-up|cleanup|swachh\w*|सफाई)/],
];

export function detectSevaType(raw: string): SevaType | null {
  const text = normaliseText(raw);
  for (const [type, re] of SEVA_WORDS) if (re.test(text)) return type;
  return null;
}

export function eventHints(text: string, now: Date, tense: "past" | "future" = "past"): EventHints {
  return { date: detectDate(text, now, tense), sevaType: detectSevaType(text) };
}

// ── number extraction ────────────────────────────────────────────────────────

const STOP = new Set(["and", "the", "of", "for", "total", "number", "given", "done", "all", "who", "that", "are", "was", "were", "with", "from"]);

/** Extra words people use for common fields (matched by KPI key or field id). */
const SYNONYMS: [RegExp, string[]][] = [
  [/(screened|registered|people|patients?)$/, ["screened", "registered", "patients", "patient", "people", "log", "logo", "mareez", "aaye", "aaya", "aayi", "visitors", "checkup", "jaanch", "beneficiaries"]],
  [/(^|[._])(male|men)$/, ["men", "male", "gents", "purush", "aadmi", "males"]],
  [/female$|women/, ["women", "female", "ladies", "mahila", "mahilayen", "aurat", "females"]],
  [/under_18|children/, ["children", "kids", "child", "bachche", "bache", "bacche", "under18"]],
  [/spectacle|glasses/, ["spectacles", "spectacle", "glasses", "chashma", "chashme", "chasme", "specs"]],
  [/cataract/, ["cataract", "motiyabind", "motia", "operation", "surgery"]],
  [/units?$/, ["units", "unit", "bottles", "bags"]],
  [/donor/, ["donors", "donor", "daata", "raktdaan", "raktdani"]],
  [/volunteers?$|sevadal/, ["volunteers", "volunteer", "sevadal", "sevadals", "seva", "karyakarta"]],
  [/hours?$/, ["hours", "hour", "ghante", "ghanta", "hrs"]],
];

const tokenise = (s: string) => normaliseText(s).split(/[^a-zऀ-ॿ]+/).filter((w) => w.length >= 2);
const stem = (w: string) => (w.length > 3 && w.endsWith("s") ? w.slice(0, -1) : w);

interface FieldKeywords {
  field: ExtractField;
  /** Keywords from the field's own label (strong). */
  own: Set<string>;
  /** Synonyms (weaker). */
  syn: Set<string>;
}

function keywordsFor(f: ExtractField): FieldKeywords {
  const own = new Set([...tokenise(f.label.en), ...tokenise(f.label.hi ?? "")].filter((w) => !STOP.has(w)).map(stem));
  const syn = new Set<string>();
  const key = `${f.kpi ?? ""} ${f.id}`.toLowerCase();
  for (const [re, words] of SYNONYMS) if (re.test(f.kpi ?? "") || re.test(f.id) || re.test(key.trim())) for (const w of words) syn.add(stem(w));
  return { field: f, own, syn };
}

/** Removes dates and clock times so their digits are not read as counts. */
function stripNonCounts(text: string): string {
  return text
    .replace(/\b20\d{2}-\d{2}-\d{2}\b/g, " ")
    .replace(/\b\d{1,2}[/.-]\d{1,2}(?:[/.-]\d{2,4})?\b/g, " ")
    .replace(/\b\d{1,2}(?:st|nd|rd|th)?\s*(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\b/g, " ")
    .replace(/\b\d{1,2}:\d{2}\s*(?:am|pm)?\b/g, " ")
    .replace(/\b\d{1,2}\s*(?:am|pm|baje)\b/g, " ")
    .replace(/\b\d{10}\b/g, " ");
}

interface NumberHit {
  value: number;
  /** [word, distance] pairs from the same clause. */
  near: [string, number][];
}

function numberHits(text: string): NumberHit[] {
  const clauses = stripNonCounts(normaliseText(text)).split(/[\n;|.,]+/);
  const hits: NumberHit[] = [];
  for (const clause of clauses) {
    const parts = clause.match(/\d+|[a-zऀ-ॿ]+/g) ?? [];
    parts.forEach((p, i) => {
      if (!/^\d+$/.test(p)) return;
      const near: [string, number][] = [];
      parts.forEach((q, j) => {
        if (j !== i && !/^\d+$/.test(q)) near.push([stem(q), Math.abs(j - i)]);
      });
      hits.push({ value: Number(p), near });
    });
  }
  return hits;
}

function score(k: FieldKeywords, hit: NumberHit): { score: number; word: string | null } {
  let best = 0;
  let word: string | null = null;
  for (const [w, dist] of hit.near) {
    if (dist > 4) continue;
    const base = dist === 1 ? 3 : dist === 2 ? 2 : 1;
    const s = k.own.has(w) ? base + 1 : k.syn.has(w) ? base : 0;
    if (s > best) {
      best = s;
      word = w;
    }
  }
  return { score: best, word };
}

const inRange = (f: ExtractField, n: number) => n >= (f.min ?? 0) && (f.max === null || n <= f.max);

/** Fills number fields from a message. Anything not found stays blank (never guessed to zero). */
export function rulesExtract(input: ExtractInput): ExtractResult {
  const hits = numberHits(input.text);
  const kws = input.fields.map(keywordsFor);
  const pairs: { k: FieldKeywords; hit: NumberHit; hi: number; s: number; word: string | null }[] = [];
  kws.forEach((k) => {
    hits.forEach((hit, hi) => {
      const r = score(k, hit);
      if (r.score > 0) pairs.push({ k, hit, hi, s: r.score, word: r.word });
    });
  });
  pairs.sort((a, b) => b.s - a.s);

  const answers: Record<string, unknown> = {};
  const fieldConfidence: Record<string, FieldConfidence> = {};
  const usedHits = new Set<number>();
  for (const p of pairs) {
    const id = p.k.field.id;
    if (id in fieldConfidence || usedHits.has(p.hi)) continue;
    usedHits.add(p.hi);
    if (!inRange(p.k.field, p.hit.value)) {
      fieldConfidence[id] = { level: "low", why: { en: `${p.hit.value} is outside the allowed range for this field.`, hi: `${p.hit.value} इस फ़ील्ड की अनुमत सीमा से बाहर है।` } };
      continue;
    }
    const rival = pairs.some((o) => o !== p && o.s >= p.s && ((o.hi === p.hi && o.k.field.id !== id) || (o.k.field.id === id && o.hi !== p.hi)));
    const level = p.s >= 3 && !rival ? "high" : "check";
    answers[id] = p.hit.value;
    fieldConfidence[id] = {
      level,
      why: { en: `Read "${p.hit.value}" next to the word "${p.word}".`, hi: `"${p.word}" के पास "${p.hit.value}" पढ़ा गया।` },
    };
  }

  // One lone number and nothing matched: it is most likely the headline count.
  if (Object.keys(answers).length === 0 && hits.length === 1) {
    const lead = input.fields.find((f) => f.required && inRange(f, hits[0].value));
    if (lead) {
      answers[lead.id] = hits[0].value;
      fieldConfidence[lead.id] = { level: "low", why: { en: "Only one number in the message; guessed which field it is for.", hi: "संदेश में केवल एक संख्या है; अनुमान से इस फ़ील्ड में रखी।" } };
    }
  }
  return { answers, fieldConfidence, model: "rules" };
}
