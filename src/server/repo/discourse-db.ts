import "server-only";
import { and, asc, eq, isNotNull, max, sql } from "drizzle-orm";
import type { GlossaryTerm } from "@/contract";
import type { Db } from "../db/client";
import { newId } from "../db/columns";
import { auditLog, discourse, discourseBlock, discourseGlossary } from "../db/tables";
import type { DiscourseSnapshot } from "../db/schema/discourses";
import { affected, isDuplicateKey, type Tx } from "./links-db";
import type { DiscourseAdminRow, DiscourseBlockRec, DiscourseChange, DiscourseRec, DiscourseRepo, PublishedDiscourse } from "./discourse-types";
import type { AuditRec } from "./types";

// Public = has a live snapshot. Editing a published discourse moves `status` to in_review but the snapshot keeps serving.
const isPublished = and(isNotNull(discourse.publishedSnapshot), isNotNull(discourse.publishedAt));

class Conflict extends Error {}

const toRec = (r: typeof discourse.$inferSelect): DiscourseRec => ({ ...r, publishedSnapshot: r.publishedSnapshot ?? null });
const toBlock = (b: typeof discourseBlock.$inferSelect): DiscourseBlockRec => ({
  discourseId: b.discourseId,
  blockId: b.blockId,
  idx: b.idx,
  type: b.type,
  en: b.en,
  hi: b.hi,
  hiAi: b.hiAi,
  status: b.status,
});

export class DbDiscourseRepo implements DiscourseRepo {
  constructor(private readonly db: Db) {}

  async published(opts: { withBlocks?: boolean } = {}): Promise<PublishedDiscourse[]> {
    const withBlocks = opts.withBlocks ?? true;
    // The list never needs paragraph text: strip it in SQL instead of shipping ~87 discourses to Node.
    const snapshot = withBlocks
      ? discourse.publishedSnapshot
      : sql<DiscourseSnapshot>`JSON_SET(${discourse.publishedSnapshot}, '$.blocks', JSON_ARRAY())`;
    const rows = await this.db.select({ slug: discourse.slug, publishedAt: discourse.publishedAt, snapshot }).from(discourse).where(isPublished).orderBy(asc(discourse.n));
    return rows.map((r) => ({ slug: r.slug, publishedAt: r.publishedAt as Date, snapshot: parseJson(r.snapshot) as DiscourseSnapshot }));
  }

  async publishedBySlug(slug: string): Promise<PublishedDiscourse | null> {
    const [r] = await this.db
      .select({ slug: discourse.slug, publishedAt: discourse.publishedAt, snapshot: discourse.publishedSnapshot })
      .from(discourse)
      .where(and(isPublished, eq(discourse.slug, slug)))
      .limit(1);
    return r ? { slug: r.slug, publishedAt: r.publishedAt as Date, snapshot: r.snapshot as DiscourseSnapshot } : null;
  }

  async glossary(): Promise<GlossaryTerm[]> {
    const rows = await this.db.select().from(discourseGlossary).orderBy(asc(discourseGlossary.term));
    return rows.map((g) => ({ term: g.term, hi: g.hi, gloss: g.gloss }));
  }

  async adminRows(): Promise<DiscourseAdminRow[]> {
    const [recs, counts] = await Promise.all([
      this.db.select().from(discourse).orderBy(asc(discourse.n)),
      this.db
        .select({
          id: discourseBlock.discourseId,
          total: sql<number>`COUNT(*)`,
          approved: sql<number>`SUM(${discourseBlock.status} = 'approved')`,
          empty: sql<number>`SUM(${discourseBlock.status} = 'empty')`,
        })
        .from(discourseBlock)
        .groupBy(discourseBlock.discourseId),
    ]);
    const by = new Map(counts.map((c) => [c.id, c]));
    return recs.map((r) => {
      const c = by.get(r.id);
      return { rec: toRec(r), counts: { total: Number(c?.total ?? 0), approved: Number(c?.approved ?? 0), empty: Number(c?.empty ?? 0) } };
    });
  }

  async byId(id: string) {
    const [r] = await this.db.select().from(discourse).where(eq(discourse.id, id)).limit(1);
    if (!r) return null;
    const blocks = await this.db.select().from(discourseBlock).where(eq(discourseBlock.discourseId, id)).orderBy(asc(discourseBlock.idx));
    return { rec: toRec(r), blocks: blocks.map(toBlock) };
  }

  async maxN() {
    const [r] = await this.db.select({ m: max(discourse.n) }).from(discourse);
    return r?.m ?? 0;
  }

  async slugs() {
    return new Set((await this.db.select({ slug: discourse.slug }).from(discourse)).map((r) => r.slug));
  }

  private async audit(tx: Tx, recs: readonly AuditRec[]) {
    if (recs.length) await tx.insert(auditLog).values(recs.map((r) => ({ ...r, id: newId() })));
  }

  async insert(rec: DiscourseRec, blocks: DiscourseBlockRec[], audit: AuditRec[]) {
    try {
      await this.db.transaction(async (tx) => {
        await tx.insert(discourse).values(rec);
        if (blocks.length) await tx.insert(discourseBlock).values(blocks.map((b) => ({ ...b, id: newId() })));
        await this.audit(tx, audit);
      });
      return "ok" as const;
    } catch (err) {
      if (isDuplicateKey(err)) return "duplicate" as const;
      throw err;
    }
  }

  async update(id: string, expectVersion: number, change: DiscourseChange, audit: AuditRec[]) {
    try {
      await this.db.transaction(async (tx) => {
        const res = await tx
          .update(discourse)
          .set({ ...(change.rec ?? {}), version: sql`${discourse.version} + 1` })
          .where(and(eq(discourse.id, id), eq(discourse.version, expectVersion)));
        if (affected(res) === 0) throw new Conflict();
        for (const b of change.blocks ?? []) {
          const set: { hi?: string | null; status?: DiscourseBlockRec["status"] } = {};
          if (b.hi !== undefined) set.hi = b.hi;
          if (b.status !== undefined) set.status = b.status;
          if (Object.keys(set).length) await tx.update(discourseBlock).set(set).where(and(eq(discourseBlock.discourseId, id), eq(discourseBlock.blockId, b.blockId)));
        }
        await this.audit(tx, audit);
      });
      return "ok" as const;
    } catch (err) {
      if (err instanceof Conflict) return "conflict" as const;
      throw err;
    }
  }
}

/** Raw `sql` JSON values come back as strings from mysql2; typed columns are already parsed. */
const parseJson = (v: unknown) => (typeof v === "string" ? JSON.parse(v) : v);
