// The model only fills fields the rules left empty. Its reply is untrusted:
// every key is type-checked (zod, with light coercion for what small models
// write: "null", "6", "a, b"), normalised the same way as the rules, and kept
// only when the value is visible in the message. Everything dropped is listed
// in `rejected`, so the reviewer and the evals see what the model tried.
import { z } from "zod";
import type { EventExtractKind, I18nText } from "@/contract";
import { EventExtractKind as KindEnum } from "@/contract";
import { normaliseText } from "../rules";
import type { FieldConfidence } from "../types";
import type { Draft, Field } from "./draft";
import { isEmpty } from "./draft";
import { clean, flat, parseDate, parseDates, parseRecurrence, parseTime, parseTimeRange, phoneDigits, resolveSamithi, toSevaType, WEEKDAYS, weekdayOf } from "./normalise";
import { ADDRESS, GREETING, PLACE, sevaOf } from "./rules";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

// ---------------------------------------------------------------- reply keys

/** Keys the model is asked for (snake_case reads better for small models), with the hint shown in the prompt. */
export const MODEL_KEYS = {
  kind: '"announcement" (upcoming event), "report" (event already held) or "other"',
  seva_type: "bhajan, eye, blood, medical, narayan_seva, bal_vikas, study_circle, disaster_relief, cleanliness or other",
  title: "headline of the message",
  samithi: 'organising samithi as written, e.g. "GGN 4"',
  date: "event date as written",
  end_date: "last day, only for multi-day events",
  start_time: 'start time as written, e.g. "6 pm"',
  end_time: "end time as written",
  recurrence: 'repeat rule as written, e.g. "every Thursday"',
  venue_name: "name of the place",
  venue_address: "street address",
  partner: "partner hospital, blood bank or NGO",
  topic: "topic or theme",
  audience: "who it is for",
  services: "list of what is offered",
  bring: "list of what to bring",
  volunteers_needed: "number of volunteers needed",
  target_count: "target number",
  target_unit: 'unit of the target, e.g. "donors"',
  contact_name: "contact person",
  contact_phone: "contact phone number",
  sevadal_note: "note for sevadal volunteers",
} as const;
export type ModelKey = keyof typeof MODEL_KEYS;

const KEY_FIELD: Record<ModelKey, Field> = {
  kind: "kind",
  seva_type: "sevaType",
  title: "title",
  samithi: "samithi",
  date: "date",
  end_date: "endDate",
  start_time: "startTime",
  end_time: "endTime",
  recurrence: "recurrence",
  venue_name: "venueName",
  venue_address: "venueAddress",
  partner: "partner",
  topic: "topic",
  audience: "audience",
  services: "services",
  bring: "bring",
  volunteers_needed: "volunteersNeeded",
  target_count: "target",
  target_unit: "target",
  contact_name: "contact",
  contact_phone: "contact",
  sevadal_note: "sevadalNote",
};

const NOTHING = /^(null|none|nil|n\/?a|na|not (mentioned|given|specified|available)|unknown|-|—|\.\.\.)$/i;
const nothing = (v: unknown) => v === undefined || v === null || v === "" || (typeof v === "string" && NOTHING.test(v.trim()));

const Text = z.preprocess(
  (v) => (nothing(v) ? null : typeof v === "number" ? String(v) : typeof v === "string" ? clean(v) || null : v),
  z.string().min(1).max(300).nullable(),
);
const List = z.preprocess((v) => {
  if (nothing(v)) return [];
  if (typeof v === "string") return v.split(/\s*[,;\n]\s*/).map(clean).filter(Boolean);
  if (Array.isArray(v)) return v.filter((x) => !nothing(x)).map((x) => (typeof x === "string" ? clean(x) : x));
  return v;
}, z.array(z.string().min(1).max(300)).max(20));
const Int = z.preprocess((v) => {
  if (nothing(v)) return null;
  if (typeof v === "string" && /^\s*\d[\d,]*\s*$/.test(v)) return Number(v.replace(/\D/g, ""));
  return v;
}, z.number().int().min(0).max(100_000).nullable());

/** One schema per key, checked one by one so a bad key never sinks the good ones. */
export const ModelReply = {
  kind: z.preprocess((v) => (nothing(v) ? null : typeof v === "string" ? v.trim().toLowerCase() : v), KindEnum.nullable()),
  seva_type: Text,
  title: Text,
  samithi: Text,
  date: Text,
  end_date: Text,
  start_time: Text,
  end_time: Text,
  recurrence: Text,
  venue_name: Text,
  venue_address: Text,
  partner: Text,
  topic: Text,
  audience: Text,
  services: List,
  bring: List,
  volunteers_needed: Int,
  target_count: Int,
  target_unit: Text,
  contact_name: Text,
  contact_phone: Text,
  sevadal_note: Text,
} satisfies Record<ModelKey, z.ZodType>;

type Checked = { [K in ModelKey]?: z.output<(typeof ModelReply)[K]> };

/** Type check: keeps valid known keys, reports unknown keys and wrong types. */
export function checkReply(raw: Record<string, unknown>, asked: readonly ModelKey[]): { values: Checked; rejected: Draft["rejected"] } {
  const values: Record<string, unknown> = {};
  const rejected: Draft["rejected"] = [];
  for (const [key, v] of Object.entries(raw)) {
    if (!(key in ModelReply)) {
      if (!nothing(v)) rejected.push({ field: key, value: show(v), reason: "unknown key" });
      continue;
    }
    const k = key as ModelKey;
    if (!asked.includes(k)) continue; // rules already filled it; the model's copy is not needed
    const r = ModelReply[k].safeParse(v);
    if (r.success) values[k] = r.data;
    else rejected.push({ field: k, value: show(v), reason: `wrong type: ${r.error.issues[0]?.message ?? "invalid"}` });
  }
  return { values: values as Checked, rejected };
}

const show = (v: unknown) => (typeof v === "string" ? v : JSON.stringify(v) ?? String(v)).slice(0, 120);

// ---------------------------------------------------------------- grounding

const words = (s: string) => flat(s).split(" ").filter((w) => w.length > 1);

/** At least 80% of the value's words appear in the message (allows "Sai Centre" vs "Sai Center" slips, not inventions). */
export function inText(value: string, text: string): boolean {
  const have = new Set(words(text));
  const want = words(value);
  if (want.length === 0) return false;
  return want.filter((w) => have.has(w)).length / want.length >= 0.8;
}

/** The message names this calendar day: written date, relative day, or day number + its weekday. */
function dateInText(iso: string, text: string, now: Date): boolean {
  if (parseDates(text, now).includes(iso) || parseDate(text, now) === iso) return true;
  const t = ` ${flat(text)} `;
  const day = Number(iso.slice(8));
  const wd = weekdayOf(iso);
  const dayHit = new RegExp(`\\b${day}(st|nd|rd|th)?\\b`).test(normaliseText(text));
  return dayHit && Object.entries(WEEKDAYS).some(([w, n]) => n === wd && t.includes(` ${w} `));
}

// Lines whose times are about something else ("call after 5.30 pm", "reporting 8 am").
const OTHER_TIME = /\b(call|contact|phone|after|reporting|report by|reach|sevadals?)\b|सेवादल|संपर्क/i;

/** The time is written in the message as an event time (each line and its comma parts, start and end). */
function timeInText(hhmm: string, text: string): boolean {
  const times = new Set<string>();
  for (const line of text.split(/\n/)) {
    if (OTHER_TIME.test(line)) continue;
    for (const part of [line, ...line.split(/[,|]/)]) {
      const r = parseTimeRange(part);
      if (r.start) times.add(r.start);
      if (r.end) times.add(r.end);
    }
  }
  return times.has(hhmm);
}

const numberInText = (n: number, text: string) => new RegExp(`(?<![\\d])${n}(?![\\d])`).test(normaliseText(text));

// ---------------------------------------------------------------- merge

const MODEL_WHY = (model: string): I18nText => ({
  en: `Guessed by the model (${model}); check it.`,
  hi: `मॉडल (${model}) का अनुमान; जाँच लें।`,
});

// Optional keys are asked only when the message has a cue for them: fewer
// keys, shorter replies, fewer chances to invent ("partner" for a bhajan).
const CUES: Partial<Record<ModelKey, RegExp>> = {
  recurrence: /\b(every|each|weekly|har)\b|हर /i,
  venue_address: /\b(sector|sec|road|rd|marg|block|phase|plot|house|flat|gali|lane|nagar|vihar|enclave|colony|extn|near|opp|opposite|behind)\b|सेक्टर|मार्ग|के पास/i,
  partner: /\b(hospital|blood bank|association|collaboration|partner|ngo|trust|foundation|rotary|lions|sahyog)\b|सहयोग/i,
  topic: /\b(topic|theme|subject|vishay|discussion|on the)\b|विषय/i,
  audience: /\b(for (all|children|kids|ladies|women|men|youth|seniors|elders|students|devotees|families)|open to|age|years|eligib)/i,
  services: /\b(free|services|check-?up|tests?|consultation|medicines?|spectacles|suvidha|distribut)/i,
  bring: /\b(bring|carry|laayen|laye|donate|contribute)\b|लाएं/i,
  volunteers_needed: /\d+\s*(volunteers|sevadals?|helpers)|\b(volunteers|sevadals?|helpers)\s*(needed|required|chahiye)/i,
  target_count: /\b(target|goal|lakshya|aim)\b|लक्ष्य/i,
  target_unit: /\b(target|goal|lakshya|aim)\b|लक्ष्य/i,
  contact_name: /\b(contact|call|sampark|phone|mob(ile)?)\b|[6-9]\d{4}[\s-]?\d{5}|संपर्क/i,
  contact_phone: /[6-9]\d{4}[\s-]?\d{5}|[६-९][०-९]{4}/,
  sevadal_note: /\b(seva ?dals?|volunteers?)\b|सेवादल/i,
};

/** Model keys worth asking for: fields the rules left empty that the message seems to talk about. */
export function keysToAsk(d: Draft, text: string): ModelKey[] {
  return (Object.keys(MODEL_KEYS) as ModelKey[]).filter((k) => {
    const cue = CUES[k];
    // The venue name often holds "Vihar"/"Nagar"; only an address word outside it counts.
    const seen = k === "venue_address" && d.venueName ? text.split(d.venueName).join(" ") : text;
    if (cue && !cue.test(seen)) return false;
    if (k === "kind") return d.kind === "other";
    // A report's "spectacles given" are results, not services to offer.
    if (d.kind === "report" && (k === "services" || k === "bring" || k === "volunteers_needed" || k === "sevadal_note" || k === "contact_name" || k === "contact_phone")) return false;
    if (k === "end_date") return false; // multi-day spans are written as ranges the rules already read
    if (k === "contact_name") return !d.contact?.name;
    if (k === "contact_phone") return !d.contact?.phone;
    return isEmpty(d, KEY_FIELD[k]);
  });
}

/**
 * Merges a parsed model reply into the draft (in place). Returns true when the
 * model contributed at least one value.
 */
export function mergeModel(d: Draft, raw: Record<string, unknown>, asked: readonly ModelKey[], text: string, now: Date, model: string): boolean {
  const { values: v, rejected } = checkReply(raw, asked);
  d.rejected.push(...rejected);
  const low: FieldConfidence = { level: "low", why: MODEL_WHY(model) };
  let used = false;
  const reject = (field: string, value: unknown, reason: string) => d.rejected.push({ field, value: show(value), reason });
  /** Sets an empty field when `ok`; otherwise records why the value was dropped. */
  const set = <F extends Field>(f: F, value: Draft[F] | null, ok: boolean, shown: unknown = value, reason = "not in the message") => {
    if (value === null || (Array.isArray(value) && value.length === 0)) return;
    if (!isEmpty(d, f)) return;
    if (!ok) return reject(f, shown, reason);
    d[f] = value;
    d.fieldConfidence[f] = low;
    used = true;
  };

  if (v.seva_type) {
    const s = toSevaType(v.seva_type);
    if (!s) reject("sevaType", v.seva_type, "not a seva type");
    else set("sevaType", s, sevaOf(text) === s || inText(v.seva_type.replace(/_/g, " "), text), v.seva_type);
  }
  if (v.title) set("title", v.title, !GREETING.test(v.title) && inText(v.title, text));
  if (v.samithi) {
    // Only a samithi the unit list knows; small models put any headline here.
    const s = resolveSamithi(v.samithi);
    if (!s?.slug) reject("samithi", v.samithi, "not a known samithi");
    else set("samithi", { raw: s.raw, slug: s.slug, name: s.name }, inText(s.raw, text) || resolveSamithi(text)?.slug === s.slug, v.samithi);
  }
  if (v.date) {
    const iso = /^\d{4}-\d{2}-\d{2}$/.test(v.date) ? v.date : parseDate(v.date, now);
    if (!iso) reject("date", v.date, "not a date");
    else set("date", iso, dateInText(iso, text, now), v.date);
  }
  for (const [k, f] of [["start_time", "startTime"], ["end_time", "endTime"]] as const) {
    const raw = v[k];
    if (!raw) continue;
    const hhmm = parseTime(raw) ?? (/^([01]\d|2[0-3]):[0-5]\d$/.test(raw) ? raw : null);
    if (!hhmm) reject(f, raw, "not a time");
    else set(f, hhmm, timeInText(hhmm, text), raw);
  }
  if (d.startTime && d.endTime && d.endTime <= d.startTime && d.fieldConfidence.endTime === low) {
    reject("endTime", d.endTime, "ends before it starts");
    d.endTime = null;
    delete d.fieldConfidence.endTime;
  }
  if (v.recurrence) {
    const r = parseRecurrence(v.recurrence);
    set("recurrence", r, Boolean(r) && inText(v.recurrence, text), v.recurrence, r ? "not in the message" : "not a repeat rule");
  }
  // Small models copy the headline into the venue, or echo a label ("Address") as a value.
  const echo = (s: string) => s === d.title || /^(address|venue|place|date|time|timings?)$/i.test(s);
  // A venue names a place or an address; a samithi name or a headline is not one.
  const placeLike = (x: string) => (PLACE.test(x) || ADDRESS.test(x)) && !resolveSamithi(x) && !sevaOf(x);
  if (v.venue_name) set("venueName", v.venue_name, !echo(v.venue_name) && v.venue_name.length <= 80 && placeLike(v.venue_name) && inText(v.venue_name, text));
  const addr = v.venue_address;
  if (addr) set("venueAddress", addr, !echo(addr) && ADDRESS.test(addr) && !flat(d.venueName ?? "").includes(flat(addr)) && inText(addr, text));
  for (const [k, f] of [["partner", "partner"], ["topic", "topic"], ["audience", "audience"]] as const) {
    const raw = v[k];
    if (raw) set(f, raw, !echo(raw) && raw !== d.title && inText(raw, text));
  }
  if (v.sevadal_note) set("sevadalNote", v.sevadal_note, CUES.sevadal_note!.test(v.sevadal_note) && inText(v.sevadal_note, text));
  for (const f of ["services", "bring"] as const) {
    const list = v[f] ?? [];
    // Items, not the headline or the seva itself ("Homeopathy free medical camp", "Sevadals").
    const kept = list.filter((x) => inText(x, text) && !flat(d.title ?? "").includes(flat(x)) && !CUES.sevadal_note!.test(x) && x.length <= 80);
    for (const x of list.filter((x) => !kept.includes(x))) reject(f, x, "not in the message");
    set(f, kept, true);
  }
  if (v.volunteers_needed != null) set("volunteersNeeded", v.volunteers_needed, numberInText(v.volunteers_needed, text));
  if (v.target_count != null) {
    const unit = v.target_unit ?? "people";
    set("target", { count: v.target_count, unit }, numberInText(v.target_count, text) && (!v.target_unit || inText(unit, text)), `${v.target_count} ${unit}`);
  }
  if (v.contact_name || v.contact_phone) {
    const name = d.contact?.name ?? (v.contact_name && inText(v.contact_name, text) ? v.contact_name : null);
    if (v.contact_name && name !== v.contact_name && !d.contact?.name) reject("contact", v.contact_name, "not in the message");
    const digits = v.contact_phone ? phoneDigits(normaliseText(v.contact_phone)) : "";
    const phoneOk = digits.length === 10 && phoneDigits(normaliseText(text).replace(/[\s-]/g, "")).includes(digits);
    const phone = d.contact?.phone ?? (phoneOk ? (v.contact_phone ?? null) : null);
    if (v.contact_phone && !phoneOk && !d.contact?.phone) reject("contact", v.contact_phone, "phone not in the message");
    if ((name && name !== d.contact?.name) || (phone && phone !== d.contact?.phone)) {
      d.contact = { name, phone };
      d.fieldConfidence.contact = low;
      used = true;
    }
  }
  if (v.kind && d.kind === "other" && v.kind !== "other" && (d.date || d.startTime || d.venueName || d.recurrence)) {
    d.kind = v.kind satisfies EventExtractKind;
    d.fieldConfidence.kind = low;
    used = true;
  }
  return used;
}

// ---------------------------------------------------------------- prompts

export const PROMPT_VARIANTS = ["keys", "skeleton", "fewshot", "schema"] as const;
export type PromptVariant = (typeof PROMPT_VARIANTS)[number];

const RULES_TEXT =
  "Copy values exactly as written in the message. Use null when the message does not say. Never guess, never invent dates, times, places or numbers.";

const EXAMPLE_MESSAGE = `Sai Ram
Faridabad 2 Samithi organises a free eye check-up camp
on Sunday 15th March at Community Hall, Sector 9, Faridabad
from 10 am to 2 pm with Sight Care Eye Hospital.
Free spectacles and eye drops. Please bring your Aadhaar card.
Sevadals report by 9:30 am. Contact Mohan 98100 00099`;

const EXAMPLE_REPLY: Record<ModelKey, unknown> = {
  kind: "announcement",
  seva_type: "eye",
  title: "Faridabad 2 Samithi organises a free eye check-up camp",
  samithi: "Faridabad 2",
  date: "15th March",
  end_date: null,
  start_time: "10 am",
  end_time: "2 pm",
  recurrence: null,
  venue_name: "Community Hall",
  venue_address: "Sector 9, Faridabad",
  partner: "Sight Care Eye Hospital",
  topic: null,
  audience: null,
  services: ["Free spectacles", "eye drops"],
  bring: ["Aadhaar card"],
  volunteers_needed: null,
  target_count: null,
  target_unit: null,
  contact_name: "Mohan",
  contact_phone: "98100 00099",
  sevadal_note: "Sevadals report by 9:30 am",
};

const pick = (keys: readonly ModelKey[]) => Object.fromEntries(keys.map((k) => [k, EXAMPLE_REPLY[k]]));

/** Chat messages asking for `keys`. Today's date lets the model resolve "this Saturday"; grounding still checks it. */
export function eventMessages(text: string, keys: readonly ModelKey[], now: Date, variant: PromptVariant = "fewshot"): ChatMessage[] {
  const msg = text.slice(0, 1500);
  const today = now.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const intro = `You read WhatsApp messages of a spiritual service organisation in Delhi (English, Hinglish or Hindi). Today is ${today}.`;
  if (variant === "keys") {
    return [
      { role: "system", content: `${intro} Reply with ONE JSON object only, with keys: ${keys.map((k) => `${k} (${MODEL_KEYS[k]})`).join(", ")}. ${RULES_TEXT}` },
      { role: "user", content: msg },
    ];
  }
  const skeleton = JSON.stringify(Object.fromEntries(keys.map((k) => [k, null])));
  if (variant === "skeleton") {
    return [
      { role: "system", content: `${intro} Fill in this JSON from the message and reply with the JSON only: ${skeleton}\nKeys: ${keys.map((k) => `${k} = ${MODEL_KEYS[k]}`).join("; ")}. ${RULES_TEXT}` },
      { role: "user", content: msg },
    ];
  }
  if (variant === "schema") {
    // Single turn, schema in the system prompt: the format extraction models (LFM2-Extract) are trained on.
    const schema = JSON.stringify(Object.fromEntries(keys.map((k) => [k, MODEL_KEYS[k]])), null, 1);
    return [
      { role: "system", content: `Return data as a JSON object with the following schema:\n${schema}\n${intro} ${RULES_TEXT}` },
      { role: "user", content: msg },
    ];
  }
  return [
    { role: "system", content: `${intro} Reply with ONE JSON object with exactly these keys: ${keys.join(", ")}. ${RULES_TEXT}` },
    { role: "user", content: EXAMPLE_MESSAGE },
    { role: "assistant", content: JSON.stringify(pick(keys)) },
    { role: "user", content: msg },
  ];
}

/** New tokens to allow: short keys, short values; enough to close the object. */
export const replyBudget = (keys: readonly ModelKey[]) => 30 + keys.length * 22;
