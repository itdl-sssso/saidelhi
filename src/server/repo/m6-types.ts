// M6 storage port: a small document store over the M6 tables (see db/schema/m6.ts)
// plus the settings write path and the few writes to existing tables the new
// admin screens need. Implemented in memory (m6-mock.ts) and on MySQL (m6-db.ts).
import type { DocTableName } from "../db/schema/m6";
import type { AuditRec, CentreRec, EstimateRec, GatheringRec, PartnerRec, SevaTypeRec } from "./types";

export type { DocTableName };

/**
 * Lookup keys per table (k1, k2):
 * form_change_request (templateId, status) · upload_batch (samithiId, sha256) ·
 * upload_row (batchId, rowKey) · article (slug, status) · followup_person (eventId, status) ·
 * followup_log (personId, -) · breach (status, -) · export_log (-, -) · migration_run (-, -) ·
 * kpi_definition (-, -) · ui_string (locale, -) · report_schedule (-, -) ·
 * monthly_report (month, scopeId) · retention_run (key, -) · user_pref (-, -).
 */
export interface DocRec<T = unknown> {
  id: string;
  k1: string | null;
  k2: string | null;
  version: number;
  data: T;
  createdAt: Date;
  updatedAt: Date;
}

export interface DocWrite<T = unknown> {
  id: string;
  k1?: string | null;
  k2?: string | null;
  data: T;
}

export interface DocListQuery {
  k1?: string;
  k2?: string;
  limit?: number;
  /** Default: newest created first. */
  order?: "asc" | "desc";
}

export type DocPutResult = { ok: true; version: number } | { ok: false; reason: "conflict" | "duplicate" };

export interface M6Repo {
  docGet<T = unknown>(table: DocTableName, id: string): Promise<DocRec<T> | null>;
  docList<T = unknown>(table: DocTableName, q?: DocListQuery): Promise<DocRec<T>[]>;
  /** New row (version 1). `duplicate` when the id exists. Audit rows land in the same transaction. */
  docInsert<T>(table: DocTableName, w: DocWrite<T>, audit?: AuditRec[]): Promise<DocPutResult>;
  /** Replaces data/keys; `conflict` when `expectVersion` differs (or the row is missing). Bumps the version. */
  docUpdate<T>(table: DocTableName, w: DocWrite<T>, expectVersion?: number, audit?: AuditRec[]): Promise<DocPutResult>;
  /** Insert or replace without a version check. */
  docUpsert<T>(table: DocTableName, w: DocWrite<T>, audit?: AuditRec[]): Promise<DocPutResult>;
  docDelete(table: DocTableName, id: string, audit?: AuditRec[]): Promise<boolean>;

  sevaTypeInsert(rec: SevaTypeRec, audit?: AuditRec[]): Promise<"ok" | "duplicate">;
  /** Patches a seva type; `conflict` when `expectVersion` differs. */
  sevaTypeUpdate(code: string, patch: Partial<Omit<SevaTypeRec, "code">>, expectVersion: number, audit?: AuditRec[]): Promise<"ok" | "conflict">;

  /** Every partner (inactive included), name order. */
  partnersAll(): Promise<PartnerRec[]>;
  partnerInsert(rec: PartnerRec, audit?: AuditRec[]): Promise<void>;
  partnerUpdate(id: string, patch: Partial<Omit<PartnerRec, "id">>, expectVersion: number, audit?: AuditRec[]): Promise<"ok" | "conflict">;
  /** Events per partner starting in [from, to). */
  eventCountsByPartner(from: Date, to: Date): Promise<Map<string, number>>;

  centreInsert(rec: CentreRec, gatherings: GatheringRec[], audit?: AuditRec[]): Promise<"ok" | "duplicate">;
  /** Patches a centre and (when given) replaces its gatherings. `duplicate` = slug taken. */
  centreUpdate(id: string, patch: Partial<Omit<CentreRec, "id" | "version" | "updatedAt">>, gatherings: GatheringRec[] | null, expectVersion: number, audit?: AuditRec[]): Promise<"ok" | "conflict" | "duplicate">;

  /** Every impact estimate incl. hidden ones (admin list). */
  estimatesAll(): Promise<EstimateRec[]>;
  estimateInsert(rec: EstimateRec, audit?: AuditRec[]): Promise<void>;
  estimateUpdate(id: string, patch: Partial<Omit<EstimateRec, "id">>, audit?: AuditRec[]): Promise<boolean>;
  estimateDelete(id: string, audit?: AuditRec[]): Promise<boolean>;

  /** Writes a `setting` row (whole JSON value). */
  setSetting(key: string, value: unknown, userId: string | null, audit?: AuditRec[]): Promise<void>;
}
