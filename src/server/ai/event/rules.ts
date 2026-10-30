// Rules for event messages: labelled lines ("Date : …", "Venue - …") are read
// with high confidence, patterns in free text with "check". Deterministic and
// offline; the model only fills what is left (./model.ts).
import type { EventExtractKind, I18nText, SevaType } from "@/contract";
import { istDate } from "../../domain/time";
import { detectDate, detectSevaType } from "../rules";
import type { FieldConfidence } from "../types";
import type { Draft } from "./draft";
import { emptyDraft } from "./draft";
import { clean, flat, parseDate, parseDates, parseRecurrence, parseTimeRange, PHONE_RE, resolveSamithi } from "./normalise";

const why = (en: string, hi: string): I18nText => ({ en, hi });
const HIGH = (src: string): FieldConfidence => ({ level: "high", why: why(`Read from "${src}".`, `"${src}" से पढ़ा गया।`) });
const CHECK = (src: string): FieldConfidence => ({ level: "check", why: why(`Found in the text: "${src}".`, `संदेश में मिला: "${src}"।`) });

export const GREETING = /^(om\s+)?(sri\s+|shri\s+)?(jai\s+)?sai\s*ram\b|^sairam\b|^om\b|^ॐ|^(ॐ\s*)?(श्री\s*)?साईं?\s*राम/i;
const GREETING_PREFIX = /^(?:(om\s+)?(sri\s+|shri\s+)?(jai\s+)?sai\s*ram|sairam|ॐ\s*(श्री\s*)?साईं?\s*राम|(श्री\s*)?साईं?\s*राम)[\s,.!🙏]*/i;
const FORWARDED = /^(-+\s*)?forwarded( message)?\s*-*$|^forwarded as received/i;

type Label = "title" | "date" | "venue" | "address" | "time" | "sevadal" | "partner" | "topic" | "audience" | "contact" | "bring" | "services" | "samithi";
const LABELS: Record<Label, RegExp> = {
  title: /^(event|programme|program|karyakram|activity|कार्यक्रम)$/i,
  date: /^(date|dated|day|din|tarikh|tithi|when|दिनांक|तारीख|तिथि|दिन)$/i,
  venue: /^(venue|place|location|sthan|jagah|where|collection point|meeting point|स्थान|जगह)$/i,
  address: /^(address|pata|पता)$/i,
  time: /^(timings?|time|samay|समय)$/i,
  sevadal: /^(seva\s?dals?|sevadal\s+note|note for sevadals?|सेवादल)$/i,
  partner: /^(partner|in association with|hospital|blood bank|organised with|organized with|सहयोग)$/i,
  topic: /^(topic|subject|theme|vishay|विषय)$/i,
  audience: /^(for|open to|who can (join|attend)|participants|age group|eligibility|kinke liye|किनके लिए)$/i,
  contact: /^(contact|contact person|call|for details|sampark|संपर्क)$/i,
  bring: /^(bring|please bring|carry|please carry|what to bring|saath laayen|साथ लाएं|लाएं)$/i,
  services: /^(services|facilities|suvidha|सुविधा|सुविधाएं)$/i,
  samithi: /^(samithi|samiti|organised by|organized by|aayojak|आयोजक|समिति)$/i,
};

/** Labelled lines ("Date : …", "Venue - …", "*Time*: …") → value after the separator. */
function labelled(lines: readonly string[]): Partial<Record<Label, string>> {
  const out: Partial<Record<Label, string>> = {};
  for (const line of lines) {
    const m = /^\s*[*_]*([^:\-–]{2,28}?)[*_]*\s*(?::|-|–|—)\s*(.+)$/.exec(line);
    if (!m) continue;
    const key = m[1].replace(/[*_]/g, "").trim();
    for (const [k, re] of Object.entries(LABELS) as [Label, RegExp][]) {
      if (!out[k] && re.test(key)) out[k] = clean(m[2].replace(/[*_]/g, ""));
    }
  }
  return out;
}

const INVITE = /\b(requested to|kindly (join|come|attend)|all are (welcome|requested|invited)|please (join|come|attend)|join us|invited|aamantrit|padhare|padharein|aayiye|aaiye|pahunchiye|पधारें|आमंत्रित|आइए|आप सभी)\b/i;
const PAST = /\b(was held|were held|was conducted|were conducted|conducted on|successfully|concluded|attended by|benefit+ed|were served|got their|thanks to all|participated|ho gaya|report|log aaye|aaye the|people came|were examined|sampann|सम्पन्न|संपन्न|आयोजित किया गया)\b/i;
export const PLACE = /\b(centre|center|mandir|temple|bhawan|bhavan|hall|school|park|ashram|hospital|community|society|apartments?|camp|ground|basti|slum|chowk|market|gurudwara|dharamshala|sadan|niwas|nilayam)\b|सेंटर|मंदिर|भवन|पार्क|विद्यालय|अस्पताल/i;
export const ADDRESS = /\d|\b(sector|sec|block|phase|road|rd|marg|lane|gali|street|near|opp|opposite|behind|plot|house|flat|floor|nagar|vihar|enclave|extn|colony)\b|सेक्टर|मार्ग|के पास/i;

const EXTRA_SEVA: [SevaType, RegExp][] = [
  ["bhajan", /\b(nagar ?sankirtan|sankirtan|akhand bhajan|bhajan sandhya|omkaram|suprabhatam)\b|भजन|संकीर्तन/i],
  ["disaster_relief", /\b(blankets?|kambal|winter relief|warm clothes|relief drive|relief material|flood)\b|कंबल|राहत/i],
  ["cleanliness", /\b(swachh?ta|swachh bharat|clean[- ]?up drive|cleaning drive|shramdaan)\b|स्वच्छता|सफ़ाई|सफाई/i],
  ["medical", /\b(medical camp|health camp|health check|dental|homeopathy|physiotherapy|bp check|sugar check|doctors?)\b|चिकित्सा|स्वास्थ्य/i],
  ["eye", /\b(eye camp|eye check|eye screening|spectacles|cataract)\b|नेत्र/i],
  ["blood", /\b(blood donation|blood donors?|blood bank|raktdaan|rakt daan)\b|रक्तदान/i],
  ["narayan_seva", /\b(narayan seva|food distribution|food packets|langar|bhojan seva|ration kits?)\b|नारायण सेवा|भोजन/i],
  ["bal_vikas", /\b(bal ?vikas|balvikas|gurus?)\b|बाल ?विकास/i],
  ["study_circle", /\b(study circle|sathya sai speaks|discourse reading)\b|स्टडी सर्किल|अध्ययन मंडल/i],
];
export const sevaOf = (s: string): SevaType | null => EXTRA_SEVA.find(([, re]) => re.test(s))?.[0] ?? detectSevaType(s);

const listOf = (s: string) =>
  s
    .split(/\s*(?:,|;|\/|•|\band\b|&|\baur\b|और|\n)\s*/i)
    .map(clean)
    .filter((x) => x.length > 1 && x.length <= 80);

/** Everything the rules can read; the model fills nulls afterwards. */
export function rulesEvent(text: string, now: Date): Draft {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, "").trim())
    .filter((l) => l && !FORWARDED.test(l));
  const body = lines.join("\n");
  const lab = labelled(lines);
  const d = emptyDraft();
  const conf = d.fieldConfidence;

  // ---- title: "Event: …" label, else first line that is not a greeting or a "Label:" line (greeting at its start dropped).
  const headline =
    lab.title ??
    lines
      .map((l) => l.replace(GREETING_PREFIX, "").replace(/[*_]/g, "").split(/(?<=[.!?।])\s+/)[0].trim())
      .find((l, i) => l.length > 2 && !GREETING.test(l) && !/^[^:]{2,28}:/.test(lines[i]) && l.length <= 120 && !/^[\d\s:./-]+$/.test(l));
  if (headline) {
    d.title = clean(headline);
    conf.title = lab.title ? HIGH(`Event: ${lab.title}`) : { level: "check", why: why("First line after the greeting.", "अभिवादन के बाद की पहली पंक्ति।") };
  }

  // ---- samithi: label, then headline, then anywhere.
  const sam = resolveSamithi(lab.samithi ?? "") ?? resolveSamithi(headline ?? "") ?? resolveSamithi(body);
  if (sam) {
    d.samithi = { raw: sam.raw, slug: sam.slug, name: sam.name };
    conf.samithi = sam.slug
      ? { level: sam.named || lab.samithi ? "high" : "check", why: why(`"${sam.raw}" read as ${sam.name}.`, `"${sam.raw}" को ${sam.name} पढ़ा गया।`) }
      : { level: "low", why: why(`"${sam.raw}" is not a known samithi.`, `"${sam.raw}" कोई ज्ञात समिति नहीं है।`) };
  }

  // ---- seva type: headline first (a bhajan message may mention "Narayan Seva" in passing).
  const seva = sevaOf(headline ?? "") ?? sevaOf(body);
  if (seva) {
    d.sevaType = seva;
    conf.sevaType = { level: sevaOf(headline ?? "") ? "high" : "check", why: why("Seva word in the message.", "संदेश में सेवा का शब्द।") };
  }

  // ---- when
  const recurrence = parseRecurrence(body);
  if (recurrence) {
    d.recurrence = recurrence;
    conf.recurrence = CHECK(recurrence.text);
  }
  const dateLine = lab.date ?? lines.find((l) => !LABELS.sevadal.test(l.split(/[:\-–]/)[0].trim()) && parseDates(l, now).length > 0) ?? null;
  const date = dateLine ? parseDate(dateLine, now) : recurrence ? null : parseDate(body, now);
  if (date) {
    d.date = date;
    conf.date = lab.date ? HIGH(`Date: ${lab.date}`) : CHECK(dateLine ?? "relative day");
    // "24-26 Oct", "24th to 26th October": a second, later date on the same line ends a multi-day event.
    const all = dateLine ? parseDates(dateLine, now) : [];
    if (all.length >= 2 && all[all.length - 1] > date && /\d\s*(?:st|nd|rd|th)?\s*(?:-|–|to|till|se|से|तक)\s*\d|(?:to|till|se|से|तक)\s/i.test(dateLine ?? "")) {
      d.endDate = all[all.length - 1];
      conf.endDate = conf.date;
    }
  }
  // Times: the "Time:" label, else the first line with a clock time that is not addressed to sevadals.
  const TIME_HINT = /\d\s*([:.]\d{2})?\s*(a\.?\s?m\b|p\.?\s?m\b|baje|बजे|hrs)|\b\d{1,2}[:.]\d{2}\b|\b12\s*noon\b/i;
  const timeLine = lab.time ?? lines.find((l) => TIME_HINT.test(l) && !/^\s*[*_]*(seva\s?dals?|सेवादल)/i.test(l) && !PHONE_RE.test(l));
  if (timeLine) {
    const r = parseTimeRange(timeLine.replace(/^[^:]{2,28}:\s*/, ""));
    const c = lab.time ? HIGH(`Time: ${lab.time}`) : CHECK(clean(timeLine));
    if (r.start) {
      d.startTime = r.start;
      conf.startTime = c;
    }
    if (r.end) {
      d.endTime = r.end;
      conf.endTime = c;
    }
  }

  // ---- where: a venue line is kept as written ("Sai Seva Bhawan, Karol Bagh"); the address comes only from its own line.
  const venue = lab.venue ?? (lab.address && PLACE.test(lab.address.split(",")[0]) && !/^\s*\d/.test(lab.address) ? lab.address : null);
  if (venue) {
    if (ADDRESS.test(venue.split(",")[0]) && !PLACE.test(venue)) d.venueAddress = venue;
    else d.venueName = venue;
    const c = HIGH(`${lab.venue ? "Venue" : "Address"}: ${venue}`);
    if (d.venueName) conf.venueName = c;
    if (d.venueAddress) conf.venueAddress = c;
  } else {
    // "… at Sai Centre, Sector 62, in association …", "Jagah Palam Vihar Sai Centre": a place word after "at", plus a capitalised area after a comma.
    const m =
      /(?:\b[Aa]t|\b[Ff]rom|\b[Vv]enue|\b[Jj]agah|\b[Ss]than|@)\s+((?:[A-Z0-9][\w'.-]*\s+){0,6}?(?:Centre|Center|Mandir|Temple|Bhawan|Bhavan|Hall|School|Park|Ashram|Hospital|Ground|Sadan|Nilayam|Kendra|Dispensary|Auditorium)\b(?:,[ \t]*[A-Z][\w'-]*(?:[ \t]+(?:[A-Z][\w'-]*|\d+)){0,3})?)/.exec(body);
    // A line that is only a place: "SAI MANDIR, DWARKA SECTOR 7", "Sai Centre NIT 3".
    const line = lines.slice(1).find(
      (l) => l.length <= 60 && PLACE.test(l.split(",")[0]) && !/[:]/.test(l) && parseDates(l, now).length === 0 && !parseTimeRange(l).start && !PHONE_RE.test(l) && !INVITE.test(l) && !PAST.test(l) && l.split(/\s+/).length <= 8 && !sevaOf(l),
    );
    const place = m ? m[1] : line;
    if (place) {
      d.venueName = clean(place);
      conf.venueName = CHECK(d.venueName);
    }
  }
  if (lab.address && lab.address !== venue && !d.venueAddress) {
    d.venueAddress = lab.address;
    conf.venueAddress = HIGH(`Address: ${lab.address}`);
  }

  // ---- what
  const partner =
    lab.partner ??
    /(?:in (?:association|collaboration|partnership) with|with the support of|supported by|courtesy|sahyog se)\s+([^.,\n]+)/i.exec(body)?.[1] ??
    /\b((?:[A-Z][\w.&'-]*\s+){1,5}(?:Eye Hospital|Hospital|Blood Bank|Blood Centre|Eye Centre|Eye Institute|Foundation|Trust))\b/.exec(body)?.[1] ??
    /([^\n,।]+?)\s+के सहयोग से/.exec(body)?.[1];
  if (partner) {
    d.partner = clean(partner);
    conf.partner = lab.partner ? HIGH(`Partner: ${lab.partner}`) : CHECK(d.partner);
  }
  if (lab.topic) {
    d.topic = lab.topic;
    conf.topic = HIGH(`Topic: ${lab.topic}`);
  }
  const audience = lab.audience ?? /\b(?:open (?:to|for)|meant for|only for)\s+([^.\n]+)/i.exec(body)?.[1] ?? /\bfor\s+((?:all\s+)?(?:children|kids|ladies|women|mahila|youth|students|senior citizens|elderly|devotees|everyone|all)\b[^.,\n]*)/i.exec(body)?.[1];
  if (audience) {
    d.audience = clean(audience);
    conf.audience = lab.audience ? HIGH(`For: ${lab.audience}`) : CHECK(d.audience);
  }
  // "FREE EYE CAMP" in the headline names the event, not a service.
  const services = lab.services ? listOf(lab.services) : [...body.replace(headline ?? "\u0000", " ").matchAll(/\bfree\s+([a-z][a-z\s-]{2,40}?)(?=\s*(?:[,.;\n&]|\band\b|$))/gi)].map((m) => clean(`free ${m[1]}`));
  if (services.length) {
    d.services = [...new Set(services)].slice(0, 20);
    conf.services = lab.services ? HIGH(`Services: ${lab.services}`) : CHECK(d.services.join(", "));
  }
  const bring = lab.bring ?? /\b(?:please (?:bring|carry)|kindly (?:bring|carry)|bring along|saath (?:laayen|layen|laaye))\s*:?\s*([^.\n]+)/i.exec(body)?.[1];
  if (bring) {
    d.bring = listOf(bring).slice(0, 20);
    conf.bring = lab.bring ? HIGH(`Bring: ${lab.bring}`) : CHECK(bring);
  }

  // ---- who
  const vol =
    /\b(\d{1,4})[ \t]*(?:more[ \t]+)?(?:sevadals?|volunteers?|seva ?dal members?)[ \t]*(?:are[ \t]+)?(?:needed|required|chahiye|wanted)/i.exec(body) ??
    /\b(?:sevadals?|volunteers?)[ \t]*(?:needed|required|chahiye|wanted)[ \t]*[:\-–][ \t]*(\d{1,4})\b/i.exec(body) ??
    /\b(?:need|needed|require|required|chahiye)[ \t]*:?[ \t]*(\d{1,4})[ \t]*(?:sevadals?|volunteers?)/i.exec(body) ??
    /\b(?:sevadals?|volunteers?)\b[^.\n\d]{0,24}?(\d{1,4})\s*(?:more\s+)?(?:needed|required|chahiye|wanted)/i.exec(body) ??
    /(\d{1,4})\s*सेवादल(?:ों)?\s*की आवश्यकता/.exec(body);
  if (vol) {
    d.volunteersNeeded = Number(vol[1]);
    conf.volunteersNeeded = CHECK(vol[0]);
  }
  const target = /\b(?:target|goal|aim|lakshya)\s*(?:is|of|:|-)?\s*(\d{1,6})\s*([a-z][a-z ]{1,24}?)(?=[.,;\n]|$)/i.exec(body) ?? /लक्ष्य\s*:?\s*(\d{1,6})\s*([^\s.,।]+)/.exec(body);
  if (target) {
    d.target = { count: Number(target[1]), unit: clean(target[2]) };
    conf.target = CHECK(target[0]);
  }
  const contactSrc =
    lab.contact ?? lines.find((l) => PHONE_RE.test(l) && /contact|call|sampark|संपर्क|details|whatsapp/i.test(l)) ?? lines.find((l) => PHONE_RE.test(l)) ?? null;
  const phone = contactSrc ? PHONE_RE.exec(contactSrc)?.[0] : undefined;
  if (contactSrc && phone) {
    d.contact = { name: contactName(contactSrc, phone), phone: phone.trim() };
    conf.contact = lab.contact ? HIGH(`Contact: ${lab.contact}`) : CHECK(contactSrc);
  }
  if (lab.sevadal) {
    d.sevadalNote = lab.sevadal;
    conf.sevadalNote = HIGH(`Sevadal: ${lab.sevadal}`);
  }

  d.kind = kindOf(body, d, now);
  // "kal" is yesterday in a report ("kal ka report"), tomorrow in an announcement.
  if (d.kind === "report" && d.date && !dateLine && !recurrence) {
    const past = detectDate(body, now, "past")?.date;
    if (past) d.date = past;
  }
  // A greeting or quote has no event title.
  if (looksLikeNoEvent(d)) {
    d.title = null;
    delete conf.title;
  }
  return d;
}

const NAME = /(?:(?:Mr|Mrs|Ms|Dr|Shri|Smt|Sri|Sis|Bro)\.?\s+)?[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2}/g;
const NOT_NAME = /^(contact|call|for|please|parents|all|kindly|whatsapp|details|registration|sai|ram|om|jai|reporting|venue|time|date|after|before|on|at)$/i;

/** The person on a contact line: the last capitalised name before the phone ("For registration call Mr. Anil Gupta - 98100…"). */
function contactName(line: string, phone: string): string | null {
  const at = line.indexOf(phone);
  const before = line.slice(0, at).replace(/^[^:]{2,28}:\s*/, "");
  const after = line.slice(at + phone.length);
  for (const part of [before, after]) {
    const names = [...part.matchAll(NAME)].map((m) => m[0].split(/\s+/).filter((w, i, ws) => !(NOT_NAME.test(w) && i < ws.length - 1 && !/\.$/.test(w))).join(" ")).filter((n) => !NOT_NAME.test(n));
    if (names.length) return names.at(-1)!;
  }
  // Devanagari or lower-case names: what is left once the contact words are gone.
  const rest = clean(before.replace(/\b(contact|call|sampark|for details|whatsapp|on|at|ji)\b|संपर्क|करें|[()]/gi, " "));
  return rest.length > 1 && rest.length <= 40 && !/\d{4}/.test(rest) ? rest : null;
}

function kindOf(text: string, d: Draft, now: Date): EventExtractKind {
  const facts = [d.date, d.startTime, d.venueName ?? d.venueAddress, d.recurrence].filter(Boolean).length;
  const past = PAST.test(text) && !INVITE.test(text);
  if (past) return "report";
  if (facts >= 2 || (facts >= 1 && (INVITE.test(text) || d.sevaType))) return d.date && (d.endDate ?? d.date) < istDate(now) ? "report" : "announcement";
  return "other";
}

/** True when nothing in the message looks like an event (keeps "Thought for the day" posts out of the model). */
export const looksLikeNoEvent = (d: Draft) => d.kind === "other" && !d.sevaType && !d.date && !d.startTime && !d.venueName && !flat(d.title ?? "").includes("seva");
