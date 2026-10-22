import {
  type AnyMySqlColumn,
  boolean,
  decimal,
  index,
  int,
  json,
  mysqlTable,
  primaryKey,
  smallint,
  text,
  tinyint,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";
import type { GatheringKind, Locale, Media, OrgUnitKind, PartnerKind, SevaType, Wing } from "@/contract";
import { idPk, idRef, timestamps } from "../columns";

/** Delhi NCR → district → samithi. */
export const orgUnit = mysqlTable(
  "org_unit",
  {
    id: idPk(),
    code: varchar("code", { length: 32 }).notNull(),
    kind: varchar("kind", { length: 16 }).$type<OrgUnitKind>().notNull(),
    nameEn: varchar("name_en", { length: 160 }).notNull(),
    nameHi: varchar("name_hi", { length: 160 }),
    slug: varchar("slug", { length: 80 }).notNull(),
    parentId: idRef("parent_id").references((): AnyMySqlColumn => orgUnit.id),
    introEn: text("intro_en"),
    introHi: text("intro_hi"),
    sortOrder: smallint("sort_order").notNull().default(0),
    active: boolean("active").notNull().default(true),
    mergedIntoId: idRef("merged_into_id"),
    version: int("version").notNull().default(1),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("org_unit_code_uq").on(t.code),
    uniqueIndex("org_unit_kind_slug_uq").on(t.kind, t.slug),
    index("org_unit_parent_idx").on(t.parentId),
  ],
);

/** Transitive closure of org_unit (depth 0 = self) for scope queries. */
export const orgClosure = mysqlTable(
  "org_closure",
  {
    ancestorId: idRef("ancestor_id")
      .notNull()
      .references(() => orgUnit.id, { onDelete: "cascade" }),
    descendantId: idRef("descendant_id")
      .notNull()
      .references(() => orgUnit.id, { onDelete: "cascade" }),
    depth: tinyint("depth").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.ancestorId, t.descendantId], name: "org_closure_pk" }),
    index("org_closure_desc_idx").on(t.descendantId),
  ],
);

export const sevaType = mysqlTable(
  "seva_type",
  {
    id: idPk(),
    code: varchar("code", { length: 32 }).$type<SevaType>().notNull(),
    labelEn: varchar("label_en", { length: 120 }).notNull(),
    labelHi: varchar("label_hi", { length: 120 }),
    /** Lucide icon name. */
    icon: varchar("icon", { length: 48 }).notNull(),
    wing: varchar("wing", { length: 16 }).$type<Wing>().notNull(),
    sortOrder: smallint("sort_order").notNull().default(0),
    active: boolean("active").notNull().default(true),
    ...timestamps(),
  },
  (t) => [uniqueIndex("seva_type_code_uq").on(t.code)],
);

export const partner = mysqlTable("partner", {
  id: idPk(),
  name: varchar("name", { length: 160 }).notNull(),
  kind: varchar("kind", { length: 16 }).$type<PartnerKind>().notNull(),
  city: varchar("city", { length: 80 }).notNull(),
  active: boolean("active").notNull().default(true),
  ...timestamps(),
});

/** Public face of a samithi. */
export const centre = mysqlTable(
  "centre",
  {
    id: idPk(),
    slug: varchar("slug", { length: 80 }).notNull(),
    samithiId: idRef("samithi_id")
      .notNull()
      .references(() => orgUnit.id),
    nameEn: varchar("name_en", { length: 160 }).notNull(),
    nameHi: varchar("name_hi", { length: 160 }),
    addressEn: varchar("address_en", { length: 400 }).notNull(),
    addressHi: varchar("address_hi", { length: 400 }),
    pincode: varchar("pincode", { length: 6 }),
    lat: decimal("lat", { precision: 9, scale: 6, mode: "number" }),
    lng: decimal("lng", { precision: 9, scale: 6, mode: "number" }),
    /** Centre's public number, never a person's. */
    contactPhone: varchar("contact_phone", { length: 20 }),
    photos: json("photos").$type<Media[]>().notNull().default([]),
    active: boolean("active").notNull().default(true),
    version: int("version").notNull().default(1),
    ...timestamps(),
  },
  (t) => [uniqueIndex("centre_slug_uq").on(t.slug), index("centre_samithi_idx").on(t.samithiId)],
);

export const centreGathering = mysqlTable(
  "centre_gathering",
  {
    id: idPk(),
    centreId: idRef("centre_id")
      .notNull()
      .references(() => centre.id, { onDelete: "cascade" }),
    /** 0 = Sunday … 6 = Saturday. */
    day: tinyint("day").notNull(),
    /** 'HH:mm' IST. */
    time: varchar("time", { length: 5 }).notNull(),
    kind: varchar("kind", { length: 16 }).$type<GatheringKind>().notNull(),
    language: varchar("language", { length: 8 }).$type<Locale | "mixed">().notNull(),
    sortOrder: smallint("sort_order").notNull().default(0),
    ...timestamps(),
  },
  (t) => [index("centre_gathering_centre_idx").on(t.centreId)],
);
