import { date, index, int, json, longtext, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";
import type { Discourse, DiscourseBlockStatus, DiscourseBlockType, DiscourseStatus, DiscourseTheme } from "@/contract";
import { idPk, idRef, timestamps } from "../columns";
import { appUser } from "./auth";

/** What the public sees: written at publish time (blocks + quotes + card fields), served as-is. */
export type DiscourseSnapshot = Discourse;

/** One discourse (M7). Text of the paragraphs lives in `discourse_block`; never committed to git. */
export const discourse = mysqlTable(
  "discourse",
  {
    id: idPk(),
    n: int("n").notNull(),
    slug: varchar("slug", { length: 120 }).notNull(),
    titleEn: varchar("title_en", { length: 300 }).notNull(),
    titleHi: varchar("title_hi", { length: 300 }),
    whyEn: varchar("why_en", { length: 600 }).notNull().default(""),
    whyHi: varchar("why_hi", { length: 600 }),
    collPrint: varchar("coll_print", { length: 200 }).notNull().default(""),
    collOnline: varchar("coll_online", { length: 200 }),
    /** Free text as printed ("1966", "May 1972", "04 October 1970"). */
    dateText: varchar("date_text", { length: 80 }).notNull().default(""),
    isoDate: date("iso_date", { mode: "string" }),
    place: varchar("place", { length: 200 }).notNull().default(""),
    occasion: varchar("occasion", { length: 300 }).notNull().default(""),
    sourceUrl: varchar("source_url", { length: 500 }),
    pdfUrl: varchar("pdf_url", { length: 500 }),
    retrieved: date("retrieved", { mode: "string" }),
    themes: json("themes").$type<DiscourseTheme[]>().notNull(),
    status: varchar("status", { length: 16 }).$type<DiscourseStatus>().notNull().default("not_started"),
    reviewerId: idRef("reviewer_id").references(() => appUser.id),
    notes: json("notes").$type<string[]>().notNull(),
    quotes: json("quotes").$type<{ en: string; hi: string | null; blockId: string | null }[]>().notNull(),
    publishedAt: timestamp("published_at", { mode: "date" }),
    publishedSnapshot: json("published_snapshot").$type<DiscourseSnapshot | null>(),
    version: int("version").notNull().default(1),
    ...timestamps(),
  },
  (t) => [uniqueIndex("discourse_n_uq").on(t.n), uniqueIndex("discourse_slug_uq").on(t.slug), index("discourse_status_idx").on(t.status)],
);

export const discourseBlock = mysqlTable(
  "discourse_block",
  {
    id: idPk(),
    discourseId: idRef("discourse_id")
      .notNull()
      .references(() => discourse.id, { onDelete: "cascade" }),
    /** Stable id inside the discourse ("s1", "s2" …). */
    blockId: varchar("block_id", { length: 32 }).notNull(),
    idx: int("idx").notNull(),
    type: varchar("type", { length: 12 }).$type<DiscourseBlockType>().notNull(),
    en: longtext("en").notNull(),
    hi: longtext("hi"),
    /** Imported AI draft (what "Request AI draft" restores). */
    hiAi: longtext("hi_ai"),
    status: varchar("status", { length: 12 }).$type<DiscourseBlockStatus>().notNull().default("empty"),
    ...timestamps(),
  },
  (t) => [uniqueIndex("discourse_block_uq").on(t.discourseId, t.blockId), index("discourse_block_idx").on(t.discourseId, t.idx)],
);

export const discourseGlossary = mysqlTable("discourse_glossary", {
  term: varchar("term", { length: 120 }).primaryKey(),
  hi: varchar("hi", { length: 200 }).notNull(),
  gloss: text("gloss"),
});
