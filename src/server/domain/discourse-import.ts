// Parses the offline translation files (`translations/NN-<slug>.hi.json` + catalog.json + glossary.json)
// into storage records. Pure: no fs, no DB. The text is copyrighted and never committed; tests use
// synthetic placeholder data only.
import { z } from "zod";
import type { DiscourseBlockType, DiscourseTheme, GlossaryTerm } from "@/contract";
import { locateQuote, parseIsoDate, slugFromFile, themesFor } from "./discourse";

const FileBlock = z.object({ id: z.string().min(1).max(32), type: z.enum(["para", "heading", "verse", "poem", "quote"]), en: z.string(), hi: z.string().nullable().optional() });

export const DiscourseFile = z.object({
  n: z.number().int(),
  title: z.string(),
  source: z.string().nullable().optional(),
  pdf: z.string().nullable().optional(),
  coll: z.string().default(""),
  date: z.string().default(""),
  place: z.string().default(""),
  occasion: z.string().default(""),
  retrieved: z.string().nullable().optional(),
  notes: z.array(z.string()).default([]),
  quote_candidates: z.array(z.object({ en: z.string(), hi: z.string().nullable().optional() })).default([]),
  blocks: z.array(FileBlock).min(1),
});
export type DiscourseFile = z.infer<typeof DiscourseFile>;

export const DiscourseCatalog = z.object({
  rows: z.array(z.object({ n: z.number().int(), occ: z.string().nullish(), place: z.string().nullish(), why: z.string().nullish() })),
  themes: z.record(z.string(), z.array(z.number().int())),
});
export type DiscourseCatalog = z.infer<typeof DiscourseCatalog>;

export const GlossaryFile = z.object({ terms: z.record(z.string(), z.string()) });

export interface ImportedBlock {
  blockId: string;
  idx: number;
  type: DiscourseBlockType;
  en: string;
  hi: string | null;
  hiAi: string | null;
}

export interface ImportedDiscourse {
  n: number;
  slug: string;
  titleEn: string;
  whyEn: string;
  collPrint: string;
  dateText: string;
  isoDate: string | null;
  place: string;
  occasion: string;
  sourceUrl: string | null;
  pdfUrl: string | null;
  retrieved: string | null;
  themes: DiscourseTheme[];
  notes: string[];
  quotes: { en: string; hi: string | null; blockId: string | null }[];
  blocks: ImportedBlock[];
}

export const MAX_IMPORT_QUOTES = 4;

const isoOrNull = (s: string | null | undefined) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null);

export function parseDiscourse(raw: unknown, file: string, catalog: DiscourseCatalog): ImportedDiscourse {
  const f = DiscourseFile.parse(raw);
  const row = catalog.rows.find((r) => r.n === f.n);
  const blocks: ImportedBlock[] = f.blocks.map((b, i) => {
    const hi = b.hi?.trim() ? b.hi : null;
    return { blockId: b.id, idx: i + 1, type: b.type === "verse" ? "poem" : b.type, en: b.en, hi, hiAi: hi };
  });
  const ids = blocks.map((b) => ({ id: b.blockId, en: b.en }));
  const quotes = f.quote_candidates.slice(0, MAX_IMPORT_QUOTES).map((q) => ({ en: q.en, hi: q.hi ?? null, blockId: locateQuote(q.en, ids) }));
  return {
    n: f.n,
    slug: slugFromFile(file),
    titleEn: f.title,
    whyEn: row?.why ?? "",
    collPrint: f.coll,
    dateText: f.date,
    isoDate: parseIsoDate(f.date),
    place: f.place || row?.place || "",
    occasion: f.occasion || row?.occ || "",
    sourceUrl: f.source ?? null,
    pdfUrl: f.pdf ?? null,
    retrieved: isoOrNull(f.retrieved),
    themes: themesFor(f.n, catalog.themes),
    notes: f.notes,
    quotes,
    blocks,
  };
}

/** Slug clashes (two files, or an existing row owned by another n) get `-<n>`. */
export function uniqueSlug(slug: string, n: number, taken: ReadonlyMap<string, number>): string {
  const owner = taken.get(slug);
  return owner === undefined || owner === n ? slug : `${slug}-${n}`;
}

export function parseGlossary(raw: unknown): GlossaryTerm[] {
  return Object.entries(GlossaryFile.parse(raw).terms).map(([term, hi]) => ({ term, hi, gloss: null }));
}
