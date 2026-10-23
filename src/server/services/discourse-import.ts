import "server-only";
import { eq } from "drizzle-orm";
import { type GlossaryTerm, QUOTES_MIN } from "@/contract";
import type { Db } from "../db/client";
import { newId } from "../db/columns";
import { discourse, discourseBlock, discourseGlossary } from "../db/tables";
import { buildSnapshot } from "../domain/discourse";
import { type ImportedDiscourse, uniqueSlug } from "../domain/discourse-import";

export interface ImportStats {
  created: number;
  updated: number;
  unchanged: number;
  blocksCreated: number;
  blocksUpdated: number;
  /** Blocks left alone because a reviewer edited or approved them. */
  blocksKept: number;
  glossary: number;
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Idempotent upsert by `n`. A discourse that moved past `ai_draft` keeps its metadata; a block whose
 * status is `edited`/`approved` is never overwritten. Re-running on unchanged files changes nothing.
 */
export async function importDiscourses(
  db: Db,
  items: readonly ImportedDiscourse[],
  glossary: readonly GlossaryTerm[],
  opts: { dryRun?: boolean } = {},
): Promise<ImportStats> {
  const stats: ImportStats = { created: 0, updated: 0, unchanged: 0, blocksCreated: 0, blocksUpdated: 0, blocksKept: 0, glossary: 0 };
  const existing = await db.select().from(discourse);
  const byN = new Map(existing.map((r) => [r.n, r]));
  const slugs = new Map(existing.map((r) => [r.slug, r.n]));

  for (const item of items.toSorted((a, b) => a.n - b.n)) {
    const row = byN.get(item.n);
    const anyHi = item.blocks.some((b) => b.hi);
    const slug = row?.slug ?? uniqueSlug(item.slug, item.n, slugs);
    slugs.set(slug, item.n);
    const meta = {
      titleEn: item.titleEn,
      whyEn: item.whyEn,
      collPrint: item.collPrint,
      dateText: item.dateText,
      isoDate: item.isoDate,
      place: item.place,
      occasion: item.occasion,
      sourceUrl: item.sourceUrl,
      pdfUrl: item.pdfUrl,
      retrieved: item.retrieved,
      themes: item.themes,
      notes: item.notes,
      quotes: item.quotes,
    };

    let id: string;
    let changed = false;
    if (!row) {
      id = newId();
      changed = true;
      if (!opts.dryRun) await db.insert(discourse).values({ id, n: item.n, slug, ...meta, status: anyHi ? "ai_draft" : "not_started" });
    } else {
      id = row.id;
      const untouched = row.status === "not_started" || row.status === "ai_draft";
      const dirty = untouched && !same(meta, { ...meta, ...pick(row, Object.keys(meta)) });
      if (dirty) {
        changed = true;
        if (!opts.dryRun) await db.update(discourse).set(meta).where(eq(discourse.id, id));
      }
    }

    const have = row ? await db.select().from(discourseBlock).where(eq(discourseBlock.discourseId, id)) : [];
    const haveById = new Map(have.map((b) => [b.blockId, b]));
    for (const b of item.blocks) {
      const cur = haveById.get(b.blockId);
      const status = b.hi ? "ai_draft" : "empty";
      if (!cur) {
        stats.blocksCreated++;
        changed = true;
        if (!opts.dryRun) await db.insert(discourseBlock).values({ discourseId: id, blockId: b.blockId, idx: b.idx, type: b.type, en: b.en, hi: b.hi, hiAi: b.hiAi, status });
        continue;
      }
      if (cur.status === "edited" || cur.status === "approved") {
        stats.blocksKept++;
        // The English source and the stored AI draft may still be refreshed; reviewer text and status stay.
        if (cur.en !== b.en || cur.hiAi !== b.hiAi || cur.idx !== b.idx || cur.type !== b.type) {
          stats.blocksUpdated++;
          changed = true;
          if (!opts.dryRun) await db.update(discourseBlock).set({ idx: b.idx, type: b.type, en: b.en, hiAi: b.hiAi }).where(eq(discourseBlock.id, cur.id));
        }
        continue;
      }
      if (cur.en !== b.en || cur.hi !== b.hi || cur.hiAi !== b.hiAi || cur.idx !== b.idx || cur.type !== b.type || cur.status !== status) {
        stats.blocksUpdated++;
        changed = true;
        if (!opts.dryRun) await db.update(discourseBlock).set({ idx: b.idx, type: b.type, en: b.en, hi: b.hi, hiAi: b.hiAi, status }).where(eq(discourseBlock.id, cur.id));
      }
    }
    if (!row) stats.created++;
    else if (changed) stats.updated++;
    else stats.unchanged++;
  }

  if (glossary.length) {
    const have = new Map((await db.select().from(discourseGlossary)).map((g) => [g.term, g]));
    for (const g of glossary) {
      const cur = have.get(g.term);
      if (cur && cur.hi === g.hi) continue;
      stats.glossary++;
      if (opts.dryRun) continue;
      await db.insert(discourseGlossary).values({ term: g.term, hi: g.hi, gloss: g.gloss }).onDuplicateKeyUpdate({ set: { hi: g.hi } });
    }
  }
  return stats;
}

/**
 * Dev seed only: marks the first `count` fully translated discourses approved and published, so the
 * public pages work as soon as the `discourses` flag is switched on. Returns the slugs.
 */
export async function publishSamples(db: Db, count: number, now: Date): Promise<string[]> {
  const rows = (await db.select().from(discourse).orderBy(discourse.n)).filter((r) => r.status !== "published");
  const out: string[] = [];
  for (const r of rows) {
    if (out.length >= count) break;
    const blocks = await db.select().from(discourseBlock).where(eq(discourseBlock.discourseId, r.id));
    const quotes = r.quotes.filter((q) => q.blockId);
    if (!blocks.length || blocks.some((b) => !b.hi) || quotes.length < QUOTES_MIN) continue;
    await db.update(discourseBlock).set({ status: "approved" }).where(eq(discourseBlock.discourseId, r.id));
    const snapshot = buildSnapshot({ ...r, quotes, publishedAt: now }, blocks);
    await db.update(discourse).set({ status: "published", quotes, publishedAt: now, publishedSnapshot: snapshot }).where(eq(discourse.id, r.id));
    out.push(r.slug);
  }
  return out;
}

function pick(row: Record<string, unknown>, keys: string[]) {
  return Object.fromEntries(keys.map((k) => [k, row[k]]));
}
