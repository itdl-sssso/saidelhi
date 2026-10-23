// Pure discourse rules shared by the importer, the public service and (B2) the workspace.
import type { Discourse, DiscourseTheme } from "@/contract";
import { DISCOURSE_THEMES } from "@/contract";
import type { DiscourseBlockRec, DiscourseRec } from "../repo/discourse-types";

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

/** "04 October 1970" / "4 Oct 1970" → "1970-10-04"; years or month-only dates → null. */
export function parseIsoDate(text: string): string | null {
  const m = /^\s*(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)\.?,?\s+(\d{4})\s*$/.exec(text);
  if (!m) return null;
  const word = m[2].toLowerCase();
  const mi = MONTHS.findIndex((x) => x === word || (word.length === 3 && x.startsWith(word)));
  if (mi < 0) return null;
  const day = Number(m[1]);
  const d = new Date(Date.UTC(Number(m[3]), mi, day));
  if (d.getUTCMonth() !== mi || d.getUTCDate() !== day) return null;
  return d.toISOString().slice(0, 10);
}

/** `01-students.hi.json` → `students`. */
export function slugFromFile(file: string): string {
  return file
    .replace(/\.hi\.json$/, "")
    .replace(/^\d+-/, "")
    .toLowerCase();
}

const norm = (s: string) => s.replace(/\s+/g, " ").trim();

/** First block whose English contains the (whitespace-normalised) quote. */
export function locateQuote(quote: string, blocks: readonly { id: string; en: string }[]): string | null {
  const q = norm(quote);
  if (!q) return null;
  return blocks.find((b) => norm(b.en).includes(q))?.id ?? null;
}

/** Theme keys for a discourse number from catalog.json's `themes` (heading → [n…]). */
export function themesFor(n: number, catalogThemes: Record<string, number[]>): DiscourseTheme[] {
  const out: DiscourseTheme[] = [];
  for (const [key, def] of Object.entries(DISCOURSE_THEMES) as [DiscourseTheme, (typeof DISCOURSE_THEMES)[DiscourseTheme]][]) {
    if (catalogThemes[def.catalog]?.includes(n)) out.push(key);
  }
  return out;
}

/** The public shape stored at publish time (all blocks must carry Hindi). */
export function buildSnapshot(rec: DiscourseRec, blocks: readonly DiscourseBlockRec[]): Discourse {
  return {
    slug: rec.slug,
    n: rec.n,
    title: { en: rec.titleEn, hi: rec.titleHi },
    date: rec.dateText,
    place: rec.place,
    occasion: rec.occasion,
    source: { coll: rec.collPrint, url: rec.sourceUrl, pdf: rec.pdfUrl },
    themes: rec.themes,
    why: { en: rec.whyEn, hi: rec.whyHi },
    blocks: [...blocks].sort((a, b) => a.idx - b.idx).map((b) => ({ id: b.blockId, type: b.type, en: b.en, hi: b.hi })),
    quotes: rec.quotes,
  };
}
