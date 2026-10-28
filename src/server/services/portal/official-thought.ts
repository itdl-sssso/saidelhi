// Official "Sai Message for the Day" (sathyasai.org, Sri Sathya Sai World Foundation).
// Source: https://www.sathyasai.org/sai-messages-for-the-day : one Drupal view row per day
// (date "Wednesday, October 28, 2026", quote text, reference link "Sri Sathya Sai Baba, <date>").
// No feed or API and no published reuse terms: this stays behind flag `thought_official`
// (needs the Trust's written permission), fetches at most once per day, honours robots (not disallowed;
// Crawl-delay 10 s is respected by making a single request), identifies itself and gives up quietly.
import { auditRec, type SystemActor } from "../../audit";
import { newId } from "../../db/columns";
import { istDate } from "../../domain/time";
import { OFFICIAL_KEY, officialOn } from "../thought";
import { loadSettings } from "../shared";
import type { PortalCtx } from "./shared";

export const OFFICIAL_URL = "https://www.sathyasai.org/sai-messages-for-the-day";
const TIMEOUT_MS = 10_000;
const MAX_BYTES = 1_500_000;

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

const decode = (s: string) =>
  s
    .replace(/<[^>]*>/g, "")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();

export interface OfficialEntry {
  /** IST calendar date, YYYY-MM-DD. */
  date: string;
  text: string;
  reference: string;
  sourceUrl: string | null;
}

/** "Wednesday, October 28, 2026" -> "2026-10-28". */
export function parseLongDate(s: string): string | null {
  const m = /([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})/.exec(s);
  const mi = m ? MONTHS.indexOf(m[1].toLowerCase()) : -1;
  if (!m || mi < 0) return null;
  return `${m[3]}-${String(mi + 1).padStart(2, "0")}-${String(Number(m[2])).padStart(2, "0")}`;
}

/** Pulls the dated rows out of the archive page HTML. Pure; unknown markup yields []. */
export function parseOfficialPage(html: string): OfficialEntry[] {
  const out: OfficialEntry[] = [];
  for (const row of html.split(/<div class="views-row /).slice(1)) {
    const date = /date-display-single">([^<]+)</.exec(row)?.[1];
    const text = /views-field-field-quote-text">\s*<div class="field-content">([\s\S]*?)<\/div>/.exec(row)?.[1];
    const ref = /views-field-field-quote-reference">\s*<div class="field-content">([\s\S]*?)<\/div>/.exec(row)?.[1];
    const iso = date ? parseLongDate(decode(date)) : null;
    const clean = text ? decode(text) : "";
    if (!iso || clean.length < 20 || clean.length > 1500) continue;
    const href = ref ? /href="(https:\/\/[^"]+)"/.exec(ref)?.[1] : undefined;
    out.push({ date: iso, text: clean, reference: ref ? decode(ref) : "Sri Sathya Sai Baba", sourceUrl: href?.startsWith("https://saispeaks.sathyasai.org/") ? href : null });
  }
  return out;
}

export type Fetcher = (url: string, init: { headers: Record<string, string>; signal: AbortSignal }) => Promise<{ ok: boolean; status: number; text(): Promise<string> }>;

/** Cron `official-thought`: stores today's official thought (once per day). Returns the new record ids. */
export async function pullOfficialThought(ctx: PortalCtx, by: SystemActor, fetcher: Fetcher = fetch as unknown as Fetcher): Promise<string[]> {
  const { repo, deps } = ctx;
  if (!officialOn((await loadSettings(repo)).flags)) return [];
  const today = istDate(deps.now());
  const have = (await repo.m6.contentItemsAll("thought_for_day")).find((c) => c.key === OFFICIAL_KEY && c.date === today);
  if (have) return [];
  let html: string;
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
    try {
      const res = await fetcher(OFFICIAL_URL, { headers: { "user-agent": "SSSSO-DelhiNCR-site/1.0 (+https://saidelhi.org; once-a-day thought)", accept: "text/html" }, signal: ctl.signal });
      if (!res.ok) return [];
      html = (await res.text()).slice(0, MAX_BYTES);
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return [];
  }
  const entry = parseOfficialPage(html).find((e) => e.date === today);
  if (!entry) return [];
  const id = newId();
  await repo.m6.contentItemInsert(
    {
      id,
      kind: "thought_for_day",
      key: OFFICIAL_KEY,
      titleEn: null,
      titleHi: null,
      bodyEn: entry.text,
      bodyHi: null,
      sourceEn: entry.reference,
      sourceHi: null,
      href: entry.sourceUrl,
      date: today,
      status: "published",
      sortOrder: 0,
      data: { origin: "official", sourceUrl: OFFICIAL_URL },
    },
    [auditRec(by, { action: "content.official_thought", entity: "content_item", entityId: id, data: { date: today } })],
  );
  deps.revalidate?.(["home"]);
  return [id];
}
