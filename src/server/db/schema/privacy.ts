import { sql } from "drizzle-orm";
import { datetime, index, json, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";
import type { Locale, PrivacyRequestStatus, PrivacyRequestType, Role } from "@/contract";
import { idPk, idRef, timestamps } from "../columns";

/** DPDP requests from /privacy. Contains personal data: restricted (pii_officer). */
export const privacyRequest = mysqlTable(
  "privacy_request",
  {
    id: idPk(),
    name: varchar("name", { length: 120 }).notNull(),
    phone: varchar("phone", { length: 20 }).notNull(),
    type: varchar("type", { length: 16 }).$type<PrivacyRequestType>().notNull(),
    details: text("details").notNull(),
    locale: varchar("locale", { length: 2 }).$type<Locale>().notNull().default("en"),
    status: varchar("status", { length: 16 }).$type<PrivacyRequestStatus>().notNull().default("received"),
    dueAt: datetime("due_at", { mode: "date" }).notNull(),
    /** sha256(ip + secret), for abuse handling only. */
    ipHash: varchar("ip_hash", { length: 64 }),
    handledBy: idRef("handled_by"),
    closedAt: datetime("closed_at", { mode: "date" }),
    ...timestamps(),
  },
  (t) => [index("privacy_request_status_idx").on(t.status, t.dueAt)],
);

/**
 * Append-only audit trail. Application code only ever INSERTs (see
 * src/server/audit.ts); there is intentionally no update/delete helper.
 */
export const auditLog = mysqlTable(
  "audit_log",
  {
    id: idPk(),
    at: timestamp("at", { mode: "date", fsp: 3 }).notNull().default(sql`CURRENT_TIMESTAMP(3)`),
    actorId: idRef("actor_id"),
    actorRole: varchar("actor_role", { length: 24 }).$type<Role | "public" | "system">(),
    action: varchar("action", { length: 64 }).notNull(),
    entity: varchar("entity", { length: 64 }).notNull(),
    entityId: varchar("entity_id", { length: 64 }),
    scopeId: idRef("scope_id"),
    requestId: varchar("request_id", { length: 64 }),
    ipHash: varchar("ip_hash", { length: 64 }),
    data: json("data").$type<Record<string, unknown>>(),
  },
  (t) => [index("audit_log_at_idx").on(t.at), index("audit_log_entity_idx").on(t.entity, t.entityId)],
);
