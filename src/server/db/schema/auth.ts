// Portal people, roles, sessions and approvals (contract §3, §5.3, M3).
import { boolean, char, datetime, index, int, mysqlTable, text, uniqueIndex, varchar } from "drizzle-orm/mysql-core";
import type { ApprovalKind, ApprovalState, Locale, Role, TimelineChannel, UserStatus } from "@/contract";
import { createdAt, idPk, idRef, timestamps } from "../columns";
import { event } from "./events";
import { orgUnit } from "./org";

/** A coordinator or staff member. Phones are sealed; lookups go through the keyed hash. */
export const appUser = mysqlTable(
  "app_user",
  {
    id: idPk(),
    name: varchar("name", { length: 120 }).notNull(),
    /** AES-GCM sealed E.164 (to send WhatsApp messages). */
    phoneEnc: varchar("phone_enc", { length: 160 }).notNull(),
    /** HMAC of the E.164 number. */
    phoneHash: char("phone_hash", { length: 64 }).notNull(),
    phoneMasked: varchar("phone_masked", { length: 24 }).notNull(),
    email: varchar("email", { length: 254 }),
    locale: varchar("locale", { length: 2 }).$type<Locale>().notNull().default("en"),
    status: varchar("status", { length: 16 }).$type<UserStatus>().notNull().default("invited"),
    lastSignInAt: datetime("last_sign_in_at", { mode: "date" }),
    invitedBy: idRef("invited_by"),
    version: int("version").notNull().default(1),
    ...timestamps(),
  },
  (t) => [uniqueIndex("app_user_phone_hash_uq").on(t.phoneHash), index("app_user_status_idx").on(t.status)],
);

/** Role history: the current assignment has `ended_at` null (one per user). */
export const roleAssignment = mysqlTable(
  "role_assignment",
  {
    id: idPk(),
    userId: idRef("user_id")
      .notNull()
      .references(() => appUser.id),
    role: varchar("role", { length: 24 }).$type<Role>().notNull(),
    /** null = no org scope (translator); ncr unit = NCR-wide. */
    scopeId: idRef("scope_id").references(() => orgUnit.id),
    createdBy: idRef("created_by"),
    createdAt: createdAt(),
    endedAt: datetime("ended_at", { mode: "date" }),
  },
  (t) => [index("role_assignment_user_idx").on(t.userId, t.endedAt), index("role_assignment_scope_idx").on(t.scopeId)],
);

/** Portal sessions (cookie `sid`). The id is sha256 of the cookie value. */
export const portalSession = mysqlTable(
  "session",
  {
    id: char("id", { length: 64 }).primaryKey(),
    userId: idRef("user_id")
      .notNull()
      .references(() => appUser.id),
    createdAt: createdAt(),
    lastSeenAt: datetime("last_seen_at", { mode: "date" }).notNull(),
    /** Sliding: renewed to now + 7 days on use. */
    expiresAt: datetime("expires_at", { mode: "date" }).notNull(),
    revokedAt: datetime("revoked_at", { mode: "date" }),
    ipHash: varchar("ip_hash", { length: 64 }),
    uaHint: varchar("ua_hint", { length: 160 }),
  },
  (t) => [index("session_user_idx").on(t.userId), index("session_expires_idx").on(t.expiresAt)],
);

/** One request for a plan or report approval, and its outcome. */
export const approval = mysqlTable(
  "approval",
  {
    id: idPk(),
    eventId: idRef("event_id")
      .notNull()
      .references(() => event.id, { onDelete: "cascade" }),
    kind: varchar("kind", { length: 8 }).$type<ApprovalKind>().notNull(),
    state: varchar("state", { length: 24 }).$type<ApprovalState>().notNull().default("pending"),
    requestedAt: datetime("requested_at", { mode: "date", fsp: 3 }).notNull(),
    requestedBy: idRef("requested_by"),
    /** Masked phone or name of whoever submitted (report links have no user). */
    requestedByLabel: varchar("requested_by_label", { length: 120 }),
    requestChannel: varchar("request_channel", { length: 16 }).$type<TimelineChannel>(),
    decidedBy: idRef("decided_by"),
    decidedAt: datetime("decided_at", { mode: "date" }),
    /** Channel of the decision: whatsapp | portal | system. */
    channel: varchar("channel", { length: 16 }).$type<TimelineChannel>(),
    reason: text("reason"),
    escalatedAt: datetime("escalated_at", { mode: "date" }),
    selfApproved: boolean("self_approved").notNull().default(false),
    ...timestamps(),
  },
  (t) => [index("approval_state_idx").on(t.state, t.requestedAt), index("approval_event_idx").on(t.eventId, t.kind)],
);

/** Idempotency ledger for job notifications (reminders, escalations): one row per unique key. */
export const notificationLog = mysqlTable(
  "notification_log",
  {
    id: idPk(),
    key: varchar("key", { length: 160 }).notNull(),
    kind: varchar("kind", { length: 32 }).notNull(),
    eventId: idRef("event_id"),
    sentAt: datetime("sent_at", { mode: "date", fsp: 3 }).notNull(),
  },
  (t) => [uniqueIndex("notification_log_key_uq").on(t.key)],
);
