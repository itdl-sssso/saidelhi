import "server-only";
import { and, asc, eq, isNotNull, sql } from "drizzle-orm";
import type { GlossaryTerm } from "@/contract";
import type { Db } from "../db/client";
import { discourse, discourseGlossary } from "../db/tables";
import type { DiscourseSnapshot } from "../db/schema/discourses";
import type { DiscourseRepo, PublishedDiscourse } from "./discourse-types";

const isPublished = and(eq(discourse.status, "published"), isNotNull(discourse.publishedSnapshot), isNotNull(discourse.publishedAt));

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
}

/** Raw `sql` JSON values come back as strings from mysql2; typed columns are already parsed. */
const parseJson = (v: unknown) => (typeof v === "string" ? JSON.parse(v) : v);
