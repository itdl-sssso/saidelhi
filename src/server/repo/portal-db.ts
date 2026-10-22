import "server-only";
import { and, asc, count, desc, eq, gte, inArray, isNull, lt, notInArray, type SQL, sql } from "drizzle-orm";
import type { EventStatus } from "@/contract";
import type { Db } from "../db/client";
import { newId } from "../db/columns";
import {
  appUser,
  approval,
  attachment,
  auditLog,
  event,
  eventTimeline,
  formLink,
  notificationLog,
  orgClosure,
  orgUnit,
  portalSession,
  roleAssignment,
  submission,
  submissionAnswerKpi,
} from "../db/tables";
import { toEventRec } from "./event-row";
import { affected, attachmentCols, isDuplicateKey, linkCols, submissionCols, type Tx } from "./links-db";
import type {
  AdminEventFilter,
  ApprovalRec,
  AuditFilter,
  EventWrite,
  NewEventWrite,
  OrgWrite,
  PortalRepo,
  RoleAssignmentRec,
  SessionRec,
  TimelineWrite,
  UserRec,
  UserWrite,
  WriteResult,
} from "./portal-types";
import type { AuditRec, OrgUnitRec } from "./types";

class Conflict extends Error {}

const userCols = {
  id: appUser.id,
  name: appUser.name,
  phoneEnc: appUser.phoneEnc,
  phoneHash: appUser.phoneHash,
  phoneMasked: appUser.phoneMasked,
  email: appUser.email,
  locale: appUser.locale,
  status: appUser.status,
  lastSignInAt: appUser.lastSignInAt,
  invitedBy: appUser.invitedBy,
  createdAt: appUser.createdAt,
  version: appUser.version,
};

const roleCols = {
  id: roleAssignment.id,
  userId: roleAssignment.userId,
  role: roleAssignment.role,
  scopeId: roleAssignment.scopeId,
  createdBy: roleAssignment.createdBy,
  createdAt: roleAssignment.createdAt,
  endedAt: roleAssignment.endedAt,
};

const sessionCols = {
  id: portalSession.id,
  userId: portalSession.userId,
  createdAt: portalSession.createdAt,
  lastSeenAt: portalSession.lastSeenAt,
  expiresAt: portalSession.expiresAt,
  revokedAt: portalSession.revokedAt,
  ipHash: portalSession.ipHash,
  uaHint: portalSession.uaHint,
};

const approvalCols = {
  id: approval.id,
  eventId: approval.eventId,
  kind: approval.kind,
  state: approval.state,
  requestedAt: approval.requestedAt,
  requestedBy: approval.requestedBy,
  requestedByLabel: approval.requestedByLabel,
  requestChannel: approval.requestChannel,
  decidedBy: approval.decidedBy,
  decidedAt: approval.decidedAt,
  channel: approval.channel,
  reason: approval.reason,
  escalatedAt: approval.escalatedAt,
  selfApproved: approval.selfApproved,
};

const auditCols = {
  id: auditLog.id,
  at: auditLog.at,
  actorId: auditLog.actorId,
  actorRole: auditLog.actorRole,
  action: auditLog.action,
  entity: auditLog.entity,
  entityId: auditLog.entityId,
  scopeId: auditLog.scopeId,
  requestId: auditLog.requestId,
  ipHash: auditLog.ipHash,
  data: auditLog.data,
};

export class DbPortalRepo implements PortalRepo {
  constructor(private readonly db: Db) {}

  private async audit(tx: Tx | Db, recs: readonly AuditRec[]) {
    if (recs.length) await tx.insert(auditLog).values(recs.map((r) => ({ ...r, id: newId() })));
  }

  private async timeline(tx: Tx, eventId: string, steps: readonly TimelineWrite[]) {
    if (steps.length) await tx.insert(eventTimeline).values(steps.map((t) => ({ id: newId(), eventId, ...t })));
  }

  // ---- People ---------------------------------------------------------------

  async userById(id: string) {
    const [r] = await this.db.select(userCols).from(appUser).where(eq(appUser.id, id)).limit(1);
    return r ?? null;
  }

  async userByPhoneHash(hash: string) {
    const [r] = await this.db.select(userCols).from(appUser).where(eq(appUser.phoneHash, hash)).limit(1);
    return r ?? null;
  }

  async usersByIds(ids: readonly string[]) {
    if (ids.length === 0) return [];
    return this.db.select(userCols).from(appUser).where(inArray(appUser.id, [...ids]));
  }

  async people() {
    const rows = await this.db
      .select({ user: userCols, role: roleCols })
      .from(appUser)
      .leftJoin(roleAssignment, and(eq(roleAssignment.userId, appUser.id), isNull(roleAssignment.endedAt)))
      .orderBy(asc(appUser.name));
    return rows.map((r) => ({ user: r.user, role: r.role }));
  }

  async currentRole(userId: string) {
    const [r] = await this.db
      .select(roleCols)
      .from(roleAssignment)
      .where(and(eq(roleAssignment.userId, userId), isNull(roleAssignment.endedAt)))
      .orderBy(desc(roleAssignment.createdAt))
      .limit(1);
    return r ?? null;
  }

  async insertUser(user: UserRec, role: RoleAssignmentRec, audit: AuditRec[]) {
    try {
      await this.db.transaction(async (tx) => {
        await tx.insert(appUser).values(user);
        await tx.insert(roleAssignment).values(role);
        await this.audit(tx, audit);
      });
      return "ok" as const;
    } catch (err) {
      if (isDuplicateKey(err)) return "duplicate" as const;
      throw err;
    }
  }

  async updateUser(w: UserWrite): Promise<WriteResult> {
    try {
      await this.db.transaction(async (tx) => {
        const res = await tx
          .update(appUser)
          .set({ ...w.patch, version: sql`${appUser.version} + 1` })
          .where(and(eq(appUser.id, w.userId), w.expectVersion !== undefined ? eq(appUser.version, w.expectVersion) : undefined));
        if (affected(res) === 0) throw new Conflict();
        if (w.newRole) {
          await tx
            .update(roleAssignment)
            .set({ endedAt: w.newRole.createdAt })
            .where(and(eq(roleAssignment.userId, w.userId), isNull(roleAssignment.endedAt)));
          await tx.insert(roleAssignment).values(w.newRole);
        }
        if (w.revokeSessionsAt) {
          await tx
            .update(portalSession)
            .set({ revokedAt: w.revokeSessionsAt })
            .where(and(eq(portalSession.userId, w.userId), isNull(portalSession.revokedAt)));
        }
        await this.audit(tx, w.audit);
      });
      return "ok";
    } catch (err) {
      if (err instanceof Conflict) return "conflict";
      throw err;
    }
  }

  // ---- Sessions -------------------------------------------------------------

  async insertSession(rec: SessionRec) {
    await this.db.insert(portalSession).values(rec);
  }

  async sessionById(id: string) {
    const [r] = await this.db.select(sessionCols).from(portalSession).where(eq(portalSession.id, id)).limit(1);
    return r ?? null;
  }

  async touchSession(id: string, lastSeenAt: Date, expiresAt: Date) {
    await this.db.update(portalSession).set({ lastSeenAt, expiresAt }).where(and(eq(portalSession.id, id), isNull(portalSession.revokedAt)));
  }

  async revokeSession(id: string, at: Date) {
    await this.db.update(portalSession).set({ revokedAt: at }).where(and(eq(portalSession.id, id), isNull(portalSession.revokedAt)));
  }

  // ---- Org ------------------------------------------------------------------

  async descendantIds(unitId: string) {
    const rows = await this.db.select({ id: orgClosure.descendantId }).from(orgClosure).where(eq(orgClosure.ancestorId, unitId));
    return rows.map((r) => r.id);
  }

  async insertOrgUnit(unit: OrgUnitRec, audit: AuditRec[]) {
    try {
      await this.db.transaction(async (tx) => {
        await tx.insert(orgUnit).values(unit);
        const supers = unit.parentId
          ? await tx.select({ id: orgClosure.ancestorId, depth: orgClosure.depth }).from(orgClosure).where(eq(orgClosure.descendantId, unit.parentId))
          : [];
        await tx.insert(orgClosure).values([
          { ancestorId: unit.id, descendantId: unit.id, depth: 0 },
          ...supers.map((s) => ({ ancestorId: s.id, descendantId: unit.id, depth: s.depth + 1 })),
        ]);
        await this.audit(tx, audit);
      });
      return "ok" as const;
    } catch (err) {
      if (isDuplicateKey(err)) return "duplicate" as const;
      throw err;
    }
  }

  async updateOrgUnit(w: OrgWrite): Promise<WriteResult> {
    try {
      await this.db.transaction(async (tx) => {
        const res = await tx
          .update(orgUnit)
          .set({ ...w.patch, version: sql`${orgUnit.version} + 1` })
          .where(and(eq(orgUnit.id, w.unitId), eq(orgUnit.version, w.expectVersion)));
        if (affected(res) === 0) throw new Conflict();
        if (w.reparent && w.patch.parentId) {
          const subtree = await tx.select({ id: orgClosure.descendantId, depth: orgClosure.depth }).from(orgClosure).where(eq(orgClosure.ancestorId, w.unitId));
          const ids = subtree.map((s) => s.id);
          await tx.delete(orgClosure).where(and(inArray(orgClosure.descendantId, ids), notInArray(orgClosure.ancestorId, ids)));
          const supers = await tx
            .select({ id: orgClosure.ancestorId, depth: orgClosure.depth })
            .from(orgClosure)
            .where(eq(orgClosure.descendantId, w.patch.parentId));
          const rows = supers.flatMap((s) => subtree.map((d) => ({ ancestorId: s.id, descendantId: d.id, depth: s.depth + d.depth + 1 })));
          if (rows.length) await tx.insert(orgClosure).values(rows);
        }
        await this.audit(tx, w.audit);
      });
      return "ok";
    } catch (err) {
      if (err instanceof Conflict) return "conflict";
      throw err;
    }
  }

  // ---- Events ---------------------------------------------------------------

  private eventWhere(f: Omit<AdminEventFilter, "sort" | "limit" | "offset">): SQL | undefined {
    if (f.samithiIds && f.samithiIds.length === 0) return sql`false`;
    return and(
      f.samithiIds ? inArray(event.samithiId, [...f.samithiIds]) : undefined,
      f.statuses ? inArray(event.status, [...f.statuses]) : undefined,
      f.from ? gte(event.startsAt, f.from) : undefined,
      f.to ? lt(event.startsAt, f.to) : undefined,
      f.sevaType ? eq(event.sevaType, f.sevaType) : undefined,
      f.districtId ? eq(event.districtId, f.districtId) : undefined,
      f.samithiId ? eq(event.samithiId, f.samithiId) : undefined,
      f.source ? eq(event.source, f.source) : undefined,
      f.overdueBefore ? and(eq(event.status, "awaiting_report"), lt(event.reportDueAt, f.overdueBefore)) : undefined,
    );
  }

  async listAdminEvents(f: AdminEventFilter) {
    const where = this.eventWhere(f);
    const col = f.sort.endsWith("updatedAt") ? event.updatedAt : event.startsAt;
    const dir = f.sort.startsWith("-") ? desc : asc;
    const [rows, [{ total }]] = await Promise.all([
      this.db.select().from(event).where(where).orderBy(dir(col), dir(event.id)).limit(f.limit).offset(f.offset),
      this.db.select({ total: count() }).from(event).where(where),
    ]);
    return { rows: rows.map(toEventRec), total };
  }

  async eventStatusCounts(f: Omit<AdminEventFilter, "statuses" | "sort" | "limit" | "offset">) {
    const rows = await this.db.select({ status: event.status, n: count() }).from(event).where(this.eventWhere(f)).groupBy(event.status);
    return new Map<EventStatus, number>(rows.map((r) => [r.status, r.n]));
  }

  async insertEvent(w: NewEventWrite) {
    await this.db.transaction(async (tx) => {
      await tx.insert(event).values(w.event);
      await this.timeline(tx, w.event.id, w.timeline);
      if (w.approval) await tx.insert(approval).values(w.approval);
      await this.audit(tx, w.audit);
    });
  }

  async writeEvent(w: EventWrite): Promise<WriteResult> {
    try {
      await this.db.transaction(async (tx) => {
        const res = await tx
          .update(event)
          .set({ ...w.patch, version: sql`${event.version} + 1`, updatedAt: w.at })
          .where(
            and(
              eq(event.id, w.eventId),
              w.expectVersion !== undefined ? eq(event.version, w.expectVersion) : undefined,
              w.expectStatuses ? inArray(event.status, [...w.expectStatuses]) : undefined,
            ),
          );
        if (affected(res) === 0) throw new Conflict();
        await this.timeline(tx, w.eventId, w.timeline);
        if (w.approvalUpdate) {
          const u = w.approvalUpdate;
          await tx
            .update(approval)
            .set(u.set)
            .where(and(eq(approval.eventId, w.eventId), inArray(approval.state, [...u.fromStates]), u.kind ? eq(approval.kind, u.kind) : undefined));
        }
        if (w.approvalInsert) await tx.insert(approval).values(w.approvalInsert);
        if (w.facts?.op === "approve") {
          await tx
            .update(submissionAnswerKpi)
            .set({ approvedAt: w.facts.at })
            .where(and(eq(submissionAnswerKpi.eventId, w.eventId), isNull(submissionAnswerKpi.approvedAt)));
        } else if (w.facts?.op === "unapprove") {
          await tx.update(submissionAnswerKpi).set({ approvedAt: null }).where(eq(submissionAnswerKpi.eventId, w.eventId));
        }
        if (w.submissions) {
          const reportLinks = tx
            .select({ id: formLink.id })
            .from(formLink)
            .where(and(eq(formLink.eventId, w.eventId), eq(formLink.purpose, "report")));
          await tx
            .update(submission)
            .set({ status: w.submissions.status, approvedAt: w.submissions.approvedAt })
            .where(and(eq(submission.eventId, w.eventId), inArray(submission.linkId, reportLinks)));
        }
        await this.audit(tx, w.audit);
      });
      return "ok";
    } catch (err) {
      if (err instanceof Conflict) return "conflict";
      throw err;
    }
  }

  async timelineFor(eventIds: readonly string[]) {
    if (eventIds.length === 0) return [];
    return this.db
      .select({
        id: eventTimeline.id,
        eventId: eventTimeline.eventId,
        status: eventTimeline.status,
        at: eventTimeline.at,
        byRole: eventTimeline.byRole,
        byLabel: eventTimeline.byLabel,
        channel: eventTimeline.channel,
        note: eventTimeline.note,
      })
      .from(eventTimeline)
      .where(inArray(eventTimeline.eventId, [...eventIds]))
      .orderBy(asc(eventTimeline.at), asc(eventTimeline.id));
  }

  async factsForEvents(eventIds: readonly string[]) {
    if (eventIds.length === 0) return [];
    return this.db
      .select({
        id: submissionAnswerKpi.id,
        eventId: submissionAnswerKpi.eventId,
        submissionId: submissionAnswerKpi.submissionId,
        kpiKey: submissionAnswerKpi.kpiKey,
        dim: submissionAnswerKpi.dim,
        value: submissionAnswerKpi.value,
        estimate: submissionAnswerKpi.estimate,
        approvedAt: submissionAnswerKpi.approvedAt,
      })
      .from(submissionAnswerKpi)
      .where(inArray(submissionAnswerKpi.eventId, [...eventIds]));
  }

  async submissionsForEvent(eventId: string) {
    return this.db.select(submissionCols).from(submission).where(eq(submission.eventId, eventId)).orderBy(desc(submission.submittedAt));
  }

  async attachmentsForEvent(eventId: string) {
    return this.db.select(attachmentCols).from(attachment).where(eq(attachment.eventId, eventId)).orderBy(asc(attachment.createdAt));
  }

  async attachmentById(id: string) {
    const [r] = await this.db.select(attachmentCols).from(attachment).where(eq(attachment.id, id)).limit(1);
    return r ?? null;
  }

  async linksForEvents(eventIds: readonly string[]) {
    if (eventIds.length === 0) return [];
    return this.db
      .select({ ...linkCols, createdAt: formLink.createdAt })
      .from(formLink)
      .where(inArray(formLink.eventId, [...eventIds]))
      .orderBy(desc(formLink.createdAt), asc(formLink.id));
  }

  // ---- Approvals ------------------------------------------------------------

  async approvals(f: { states?: readonly ApprovalRec["state"][]; eventIds?: readonly string[]; kind?: ApprovalRec["kind"] }) {
    if (f.eventIds && f.eventIds.length === 0) return [];
    return this.db
      .select(approvalCols)
      .from(approval)
      .where(
        and(
          f.states ? inArray(approval.state, [...f.states]) : undefined,
          f.eventIds ? inArray(approval.eventId, [...f.eventIds]) : undefined,
          f.kind ? eq(approval.kind, f.kind) : undefined,
        ),
      )
      .orderBy(asc(approval.requestedAt));
  }

  // ---- Audit ----------------------------------------------------------------

  async insertAudit(rec: AuditRec) {
    await this.audit(this.db, [rec]);
  }

  async listAudit(f: AuditFilter) {
    const where = and(
      f.action ? eq(auditLog.action, f.action) : undefined,
      f.entity ? eq(auditLog.entity, f.entity) : undefined,
      f.entityId ? eq(auditLog.entityId, f.entityId) : undefined,
      f.actorId ? eq(auditLog.actorId, f.actorId) : undefined,
      f.from ? gte(auditLog.at, f.from) : undefined,
      f.to ? lt(auditLog.at, f.to) : undefined,
    );
    const [rows, [{ total }]] = await Promise.all([
      this.db.select(auditCols).from(auditLog).where(where).orderBy(desc(auditLog.at), desc(auditLog.id)).limit(f.limit).offset(f.offset),
      this.db.select({ total: count() }).from(auditLog).where(where),
    ]);
    return { rows, total };
  }

  // ---- Jobs -----------------------------------------------------------------

  async claimNotification(key: string, kind: string, eventId: string | null, at: Date) {
    try {
      await this.db.insert(notificationLog).values({ id: newId(), key, kind, eventId, sentAt: at });
      return true;
    } catch (err) {
      if (isDuplicateKey(err)) return false;
      throw err;
    }
  }
}
