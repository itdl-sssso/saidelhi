import { index, int, json, mysqlTable, varchar } from "drizzle-orm/mysql-core";
import { timestamps } from "../columns";

/**
 * M6 portal tables share one shape: a ULID/natural key, two indexed lookup keys
 * (meaning per table, see repo/m6-types.ts), an optimistic version and the record as
 * JSON. Volumes are small (coordinator tools), so services filter in memory.
 */
const docTable = <N extends string>(name: N) =>
  mysqlTable(
    name,
    {
      id: varchar("id", { length: 120 }).primaryKey(),
      k1: varchar("k1", { length: 120 }),
      k2: varchar("k2", { length: 120 }),
      version: int("version").notNull().default(1),
      data: json("data").$type<unknown>().notNull(),
      ...timestamps(),
    },
    (t) => [index(`${name}_k1_idx`).on(t.k1, t.k2)],
  );

export const formChangeRequest = docTable("form_change_request");
export const uploadBatch = docTable("upload_batch");
export const uploadRow = docTable("upload_row");
export const article = docTable("article");
export const followupPerson = docTable("followup_person");
export const followupLog = docTable("followup_log");
export const breach = docTable("breach");
export const exportLog = docTable("export_log");
export const migrationRun = docTable("migration_run");
export const kpiDefinition = docTable("kpi_definition");
export const uiString = docTable("ui_string");
export const reportSchedule = docTable("report_schedule");
export const monthlyReport = docTable("monthly_report");
export const retentionRun = docTable("retention_run");
export const userPref = docTable("user_pref");
export const galleryAlbum = docTable("gallery_album");
export const galleryPhoto = docTable("gallery_photo");

export const M6_DOC_TABLES = {
  form_change_request: formChangeRequest,
  upload_batch: uploadBatch,
  upload_row: uploadRow,
  article,
  followup_person: followupPerson,
  followup_log: followupLog,
  breach,
  export_log: exportLog,
  migration_run: migrationRun,
  kpi_definition: kpiDefinition,
  ui_string: uiString,
  report_schedule: reportSchedule,
  monthly_report: monthlyReport,
  retention_run: retentionRun,
  user_pref: userPref,
  gallery_album: galleryAlbum,
  gallery_photo: galleryPhoto,
} as const;
export type DocTableName = keyof typeof M6_DOC_TABLES;
