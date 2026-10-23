import {
  type AnyMySqlColumn,
  boolean,
  date,
  datetime,
  decimal,
  index,
  int,
  json,
  mysqlTable,
  text,
  varchar,
} from "drizzle-orm/mysql-core";
import type { EventStatus, I18nText, Media, Role, SevaType, Source, TimelineChannel } from "@/contract";
import { createdAt, idPk, idRef, timestamps } from "../columns";
import { formVersion } from "./forms";
import { centre, orgUnit, partner, sevaType } from "./org";

export const event = mysqlTable(
  "event",
  {
    id: idPk(),
    sevaType: varchar("seva_type", { length: 32 })
      .$type<SevaType>()
      .notNull()
      .references(() => sevaType.code),
    status: varchar("status", { length: 24 }).$type<EventStatus>().notNull().default("draft"),
    titleEn: varchar("title_en", { length: 200 }).notNull(),
    titleHi: varchar("title_hi", { length: 200 }),
    descriptionEn: text("description_en"),
    descriptionHi: text("description_hi"),
    /** UTC instants. */
    startsAt: datetime("starts_at", { mode: "date" }).notNull(),
    endsAt: datetime("ends_at", { mode: "date" }),
    postponedTo: datetime("postponed_to", { mode: "date" }),
    venueName: varchar("venue_name", { length: 200 }).notNull(),
    venueAddress: varchar("venue_address", { length: 400 }).notNull().default(""),
    venueLat: decimal("venue_lat", { precision: 9, scale: 6, mode: "number" }),
    venueLng: decimal("venue_lng", { precision: 9, scale: 6, mode: "number" }),
    samithiId: idRef("samithi_id")
      .notNull()
      .references(() => orgUnit.id),
    /** Denormalised parent district of samithi_id, for scope filters. */
    districtId: idRef("district_id")
      .notNull()
      .references(() => orgUnit.id),
    centreId: idRef("centre_id").references(() => centre.id),
    partnerId: idRef("partner_id").references(() => partner.id),
    volunteersNeeded: int("volunteers_needed"),
    volunteersJoined: int("volunteers_joined").notNull().default(0),
    bring: json("bring").$type<I18nText[]>().notNull().default([]),
    resultsPhotos: json("results_photos").$type<Media[]>().notNull().default([]),
    recurring: boolean("recurring").notNull().default(false),
    source: varchar("source", { length: 16 }).$type<Source>().notNull().default("portal"),
    /** app_user.id once M3 lands. */
    createdBy: idRef("created_by"),
    reportDueAt: datetime("report_due_at", { mode: "date" }),
    /** Report form version locked when the first report/desk link is issued. */
    formVersionId: idRef("form_version_id").references((): AnyMySqlColumn => formVersion.id),
    approvedAt: datetime("approved_at", { mode: "date" }),
    /** When the plan was last sent for approval. */
    approvalRequestedAt: datetime("approval_requested_at", { mode: "date" }),
    escalatedAt: datetime("escalated_at", { mode: "date" }),
    /** Status before escalation (awaiting_approval or report_submitted), so approval resumes the right path. */
    escalatedFrom: varchar("escalated_from", { length: 24 }).$type<EventStatus>(),
    /** District coordinator planned and approved their own event (spec 27). */
    selfApproved: boolean("self_approved").notNull().default(false),
    version: int("version").notNull().default(1),
    ...timestamps(),
  },
  (t) => [
    index("event_status_starts_idx").on(t.status, t.startsAt),
    index("event_district_starts_idx").on(t.districtId, t.startsAt),
    index("event_samithi_starts_idx").on(t.samithiId, t.startsAt),
    index("event_seva_type_idx").on(t.sevaType),
  ],
);

/** Append-only lifecycle trail shown on event detail. */
export const eventTimeline = mysqlTable(
  "event_timeline",
  {
    id: idPk(),
    eventId: idRef("event_id")
      .notNull()
      .references(() => event.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 24 }).$type<EventStatus | "event_day">().notNull(),
    at: datetime("at", { mode: "date", fsp: 3 }),
    byRole: varchar("by_role", { length: 24 }).$type<Role>(),
    byLabel: varchar("by_label", { length: 120 }),
    byUserId: idRef("by_user_id"),
    channel: varchar("channel", { length: 16 }).$type<TimelineChannel>(),
    note: text("note"),
    createdAt: createdAt(),
  },
  (t) => [index("event_timeline_event_idx").on(t.eventId, t.at)],
);

/**
 * Flattened KPI facts from submissions (one row per kpi key and optional
 * dimension, e.g. kpi 'eye.spectacles_by_power' dim '+1.5'). Public reads only
 * count rows with approved_at set on events with status 'approved'.
 */
export const submissionAnswerKpi = mysqlTable(
  "submission_answer_kpi",
  {
    id: idPk(),
    eventId: idRef("event_id")
      .notNull()
      .references(() => event.id, { onDelete: "cascade" }),
    /** submission.id once M2 lands; null for seeded/portal-entered totals. */
    submissionId: idRef("submission_id"),
    kpiKey: varchar("kpi_key", { length: 64 }).notNull(),
    dim: varchar("dim", { length: 32 }).notNull().default(""),
    /** null = field left blank (not reported); 0 is a real zero. */
    value: int("value"),
    estimate: boolean("estimate").notNull().default(false),
    approvedAt: datetime("approved_at", { mode: "date" }),
    ...timestamps(),
  },
  (t) => [
    index("kpi_event_idx").on(t.eventId),
    index("kpi_key_idx").on(t.kpiKey, t.dim),
    index("kpi_submission_idx").on(t.submissionId),
  ],
);

/** Rough historical figures supplied by districts for months before the platform. */
export const impactEstimate = mysqlTable(
  "impact_estimate",
  {
    id: idPk(),
    orgUnitId: idRef("org_unit_id")
      .notNull()
      .references(() => orgUnit.id),
    sevaType: varchar("seva_type", { length: 32 }).$type<SevaType>(),
    /** 'activities' or a KPI key. */
    kpiKey: varchar("kpi_key", { length: 64 }).notNull(),
    /** First day of the month the estimate covers. */
    month: date("month", { mode: "string" }).notNull(),
    /** 'year' estimates sit on Jan 1 of their year. */
    period: varchar("period", { length: 8 }).$type<"year" | "month">().notNull().default("month"),
    value: int("value").notNull(),
    note: text("note"),
    visible: boolean("visible").notNull().default(true),
    createdBy: idRef("created_by"),
    ...timestamps(),
  },
  (t) => [index("impact_estimate_month_idx").on(t.month), index("impact_estimate_unit_idx").on(t.orgUnitId)],
);
