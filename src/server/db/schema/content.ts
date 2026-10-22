import {
  bigint,
  date,
  datetime,
  index,
  int,
  json,
  longtext,
  mysqlTable,
  smallint,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";
import type { ContentKind } from "@/contract";
import { idPk, idRef, timestamps } from "../columns";
import { event } from "./events";
import { orgUnit } from "./org";

export type ArticleStatus = "published" | "hidden" | "draft";
export type ContentStatus = "draft" | "published" | "archived";

/**
 * Side table for legacy `postcontent_postcontent` rows (keyed by its id; no FK
 * so the Django table is never touched). Missing row = published, English only.
 */
export const articleI18n = mysqlTable(
  "article_i18n",
  {
    legacyId: bigint("legacy_id", { mode: "number" }).primaryKey(),
    titleHi: varchar("title_hi", { length: 300 }),
    summaryHi: varchar("summary_hi", { length: 1000 }),
    bodyHi: longtext("body_hi"),
    districtId: idRef("district_id").references(() => orgUnit.id),
    eventId: idRef("event_id").references(() => event.id),
    status: varchar("status", { length: 16 }).$type<ArticleStatus>().notNull().default("published"),
    ...timestamps(),
  },
  (t) => [index("article_i18n_event_idx").on(t.eventId), index("article_i18n_district_idx").on(t.districtId)],
);

/** Thought for the day, announcements and editable home sections. */
export const contentItem = mysqlTable(
  "content_item",
  {
    id: idPk(),
    kind: varchar("kind", { length: 24 }).$type<ContentKind>().notNull(),
    /** Stable key for home sections (e.g. 'wing.service'). */
    key: varchar("key", { length: 64 }),
    titleEn: varchar("title_en", { length: 300 }),
    titleHi: varchar("title_hi", { length: 300 }),
    bodyEn: text("body_en"),
    bodyHi: text("body_hi"),
    /** Attribution (thought for the day). */
    sourceEn: varchar("source_en", { length: 300 }),
    sourceHi: varchar("source_hi", { length: 300 }),
    href: varchar("href", { length: 400 }),
    /** Display date (thought for the day), IST. */
    date: date("date", { mode: "string" }),
    startsAt: datetime("starts_at", { mode: "date" }),
    endsAt: datetime("ends_at", { mode: "date" }),
    status: varchar("status", { length: 16 }).$type<ContentStatus>().notNull().default("draft"),
    data: json("data").$type<Record<string, unknown>>(),
    sortOrder: smallint("sort_order").notNull().default(0),
    version: int("version").notNull().default(1),
    ...timestamps(),
  },
  (t) => [index("content_item_kind_date_idx").on(t.kind, t.date), index("content_item_key_idx").on(t.key)],
);

/** Key/JSON settings: 'flags' (discourses/offline_mode/ai_extraction), 'impact', … */
export const setting = mysqlTable("setting", {
  key: varchar("key", { length: 64 }).primaryKey(),
  value: json("value").$type<unknown>().notNull(),
  updatedBy: idRef("updated_by"),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow().onUpdateNow(),
  note: text("note"),
});
