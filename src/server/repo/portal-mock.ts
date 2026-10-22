import type { EventStatus } from "@/contract";
import { newId } from "../db/columns";
import type { Fixtures } from "../mock/fixtures";
import type { PortalFixtures } from "../mock/fixtures/people";
import type { MemoryLinksRepo } from "./links-mock";
import type {
  AdminEventFilter,
  ApprovalRec,
  AuditFilter,
  AuditRow,
  EventWrite,
  NewEventWrite,
  OrgWrite,
  PersonRec,
  PortalRepo,
  RoleAssignmentRec,
  SessionRec,
  TimelineWrite,
  UserRec,
  UserWrite,
  WriteResult,
} from "./portal-types";
import type { AuditRec, EventRec, OrgUnitRec, TimelineRec } from "./types";

const LINK_SEED_CREATED = new Date("2026-10-01T04:30:00Z");

/** In-memory PortalRepo over the shared fixtures (writes stay in memory). */
export class MemoryPortalRepo implements PortalRepo {
  readonly users: UserRec[];
  readonly roles: RoleAssignmentRec[];
  readonly sessions: SessionRec[] = [];
  readonly audit: AuditRow[] = [];
  readonly notifications = new Set<string>();

  constructor(
    private readonly fx: Fixtures,
    private readonly links: MemoryLinksRepo,
    seed: PortalFixtures,
  ) {
    this.users = seed.users;
    this.roles = seed.roles;
    links.approvals.push(...seed.approvals);
  }

  get approvalsList(): ApprovalRec[] {
    return this.links.approvals;
  }

  private pushAudit(recs: readonly AuditRec[], at: Date) {
    for (const r of recs) this.audit.push({ ...r, id: newId(), at });
  }

  private pushTimeline(eventId: string, steps: readonly TimelineWrite[]) {
    for (const t of steps) {
      const rec: TimelineRec = { id: newId(), eventId, status: t.status, at: t.at, byRole: t.byRole, byLabel: t.byLabel, channel: t.channel, note: t.note };
      this.fx.timeline.push(rec);
    }
  }

  // ---- People ---------------------------------------------------------------

  async userById(id: string) {
    return this.users.find((u) => u.id === id) ?? null;
  }

  async userByPhoneHash(hash: string) {
    return this.users.find((u) => u.phoneHash === hash) ?? null;
  }

  async usersByIds(ids: readonly string[]) {
    return this.users.filter((u) => ids.includes(u.id));
  }

  async people(): Promise<PersonRec[]> {
    return this.users.map((user) => ({ user, role: this.roles.find((r) => r.userId === user.id && r.endedAt === null) ?? null }));
  }

  async currentRole(userId: string) {
    return this.roles.find((r) => r.userId === userId && r.endedAt === null) ?? null;
  }

  async insertUser(user: UserRec, role: RoleAssignmentRec, audit: AuditRec[]) {
    if (this.users.some((u) => u.phoneHash === user.phoneHash)) return "duplicate" as const;
    this.users.push({ ...user });
    this.roles.push({ ...role });
    this.pushAudit(audit, user.createdAt);
    return "ok" as const;
  }

  async updateUser(w: UserWrite): Promise<WriteResult> {
    const u = this.users.find((x) => x.id === w.userId);
    if (!u || (w.expectVersion !== undefined && u.version !== w.expectVersion)) return "conflict";
    Object.assign(u, w.patch, { version: u.version + 1 });
    if (w.newRole) {
      for (const r of this.roles) if (r.userId === u.id && r.endedAt === null) r.endedAt = w.newRole.createdAt;
      this.roles.push({ ...w.newRole });
    }
    if (w.revokeSessionsAt) {
      for (const s of this.sessions) if (s.userId === u.id && !s.revokedAt) s.revokedAt = w.revokeSessionsAt;
    }
    this.pushAudit(w.audit, w.revokeSessionsAt ?? w.newRole?.createdAt ?? new Date());
    return "ok";
  }

  // ---- Sessions -------------------------------------------------------------

  async insertSession(rec: SessionRec) {
    this.sessions.push({ ...rec });
  }

  async sessionById(id: string) {
    return this.sessions.find((s) => s.id === id) ?? null;
  }

  async touchSession(id: string, lastSeenAt: Date, expiresAt: Date) {
    const s = this.sessions.find((x) => x.id === id);
    if (s) Object.assign(s, { lastSeenAt, expiresAt });
  }

  async revokeSession(id: string, at: Date) {
    const s = this.sessions.find((x) => x.id === id);
    if (s && !s.revokedAt) s.revokedAt = at;
  }

  // ---- Org ------------------------------------------------------------------

  async descendantIds(unitId: string) {
    const out = [unitId];
    for (let i = 0; i < out.length; i++) {
      for (const u of this.fx.orgUnits) if (u.parentId === out[i] && !out.includes(u.id)) out.push(u.id);
    }
    return this.fx.orgUnits.some((u) => u.id === unitId) ? out : [];
  }

  async insertOrgUnit(unit: OrgUnitRec, audit: AuditRec[]) {
    if (this.fx.orgUnits.some((u) => u.code === unit.code || (u.kind === unit.kind && u.slug === unit.slug))) return "duplicate" as const;
    this.fx.orgUnits.push({ ...unit });
    this.pushAudit(audit, new Date());
    return "ok" as const;
  }

  async updateOrgUnit(w: OrgWrite): Promise<WriteResult> {
    const u = this.fx.orgUnits.find((x) => x.id === w.unitId);
    if (!u || u.version !== w.expectVersion) return "conflict";
    Object.assign(u, w.patch, { version: u.version + 1 });
    this.pushAudit(w.audit, new Date());
    return "ok";
  }

  // ---- Events ---------------------------------------------------------------

  private filterEvents(f: Omit<AdminEventFilter, "sort" | "limit" | "offset">): EventRec[] {
    return this.fx.events.filter(
      (e) =>
        (!f.samithiIds || f.samithiIds.includes(e.samithiId)) &&
        (!f.statuses || f.statuses.includes(e.status)) &&
        (!f.from || e.startsAt >= f.from) &&
        (!f.to || e.startsAt < f.to) &&
        (!f.sevaType || e.sevaType === f.sevaType) &&
        (!f.districtId || e.districtId === f.districtId) &&
        (!f.samithiId || e.samithiId === f.samithiId) &&
        (!f.source || e.source === f.source) &&
        (!f.overdueBefore || (e.status === "awaiting_report" && e.reportDueAt !== null && e.reportDueAt < f.overdueBefore)),
    );
  }

  async listAdminEvents(f: AdminEventFilter) {
    const key = f.sort.replace("-", "") as "startsAt" | "updatedAt";
    const dir = f.sort.startsWith("-") ? -1 : 1;
    const rows = this.filterEvents(f).sort((a, b) => dir * (a[key].getTime() - b[key].getTime()) || a.id.localeCompare(b.id));
    return { rows: rows.slice(f.offset, f.offset + f.limit), total: rows.length };
  }

  async eventStatusCounts(f: Omit<AdminEventFilter, "statuses" | "sort" | "limit" | "offset">) {
    const out = new Map<EventStatus, number>();
    for (const e of this.filterEvents(f)) out.set(e.status, (out.get(e.status) ?? 0) + 1);
    return out;
  }

  async insertEvent(w: NewEventWrite) {
    this.fx.events.push({ ...w.event });
    this.pushTimeline(w.event.id, w.timeline);
    if (w.approval) this.approvalsList.push({ ...w.approval });
    this.pushAudit(w.audit, w.event.updatedAt);
  }

  async writeEvent(w: EventWrite): Promise<WriteResult> {
    const ev = this.fx.events.find((e) => e.id === w.eventId);
    if (!ev) return "conflict";
    if (w.expectVersion !== undefined && ev.version !== w.expectVersion) return "conflict";
    if (w.expectStatuses && !w.expectStatuses.includes(ev.status)) return "conflict";
    Object.assign(ev, w.patch, { version: ev.version + 1, updatedAt: w.at });
    this.pushTimeline(ev.id, w.timeline);
    if (w.approvalUpdate) {
      const u = w.approvalUpdate;
      for (const a of this.approvalsList) {
        if (a.eventId === ev.id && u.fromStates.includes(a.state) && (!u.kind || a.kind === u.kind)) Object.assign(a, u.set);
      }
    }
    if (w.approvalInsert) this.approvalsList.push({ ...w.approvalInsert });
    if (w.facts) {
      for (const f of this.fx.kpiFacts) {
        if (f.eventId !== ev.id) continue;
        if (w.facts.op === "approve" && f.approvedAt === null) f.approvedAt = w.facts.at;
        if (w.facts.op === "unapprove") f.approvedAt = null;
      }
    }
    if (w.submissions) {
      const reportLinks = new Set(this.links.links.filter((l) => l.eventId === ev.id && l.purpose === "report").map((l) => l.id));
      for (const s of this.links.submissions) {
        if (s.eventId === ev.id && s.linkId && reportLinks.has(s.linkId)) Object.assign(s, w.submissions);
      }
    }
    this.pushAudit(w.audit, w.at);
    return "ok";
  }

  async timelineFor(eventIds: readonly string[]) {
    return this.fx.timeline.filter((t) => eventIds.includes(t.eventId));
  }

  async factsForEvents(eventIds: readonly string[]) {
    return this.fx.kpiFacts.filter((f) => eventIds.includes(f.eventId));
  }

  async submissionsForEvent(eventId: string) {
    return this.links.submissions.filter((s) => s.eventId === eventId);
  }

  async attachmentsForEvent(eventId: string) {
    return this.links.attachments.filter((a) => a.eventId === eventId);
  }

  async attachmentById(id: string) {
    return this.links.attachments.find((a) => a.id === id) ?? null;
  }

  async linksForEvents(eventIds: readonly string[]) {
    return this.links.links
      .filter((l) => eventIds.includes(l.eventId))
      .map((l) => ({ ...l, createdAt: this.links.linkCreatedAt.get(l.id) ?? LINK_SEED_CREATED }));
  }

  // ---- Approvals ------------------------------------------------------------

  async approvals(f: { states?: readonly ApprovalRec["state"][]; eventIds?: readonly string[]; kind?: ApprovalRec["kind"] }) {
    return this.approvalsList.filter(
      (a) => (!f.states || f.states.includes(a.state)) && (!f.eventIds || f.eventIds.includes(a.eventId)) && (!f.kind || a.kind === f.kind),
    );
  }

  // ---- Audit ----------------------------------------------------------------

  async insertAudit(rec: AuditRec) {
    this.pushAudit([rec], new Date());
  }

  async listAudit(f: AuditFilter) {
    const rows = this.audit
      .filter(
        (a) =>
          (!f.action || a.action === f.action) &&
          (!f.entity || a.entity === f.entity) &&
          (!f.entityId || a.entityId === f.entityId) &&
          (!f.actorId || a.actorId === f.actorId) &&
          (!f.from || a.at >= f.from) &&
          (!f.to || a.at < f.to),
      )
      .sort((a, b) => b.at.getTime() - a.at.getTime() || b.id.localeCompare(a.id));
    return { rows: rows.slice(f.offset, f.offset + f.limit), total: rows.length };
  }

  // ---- Jobs -----------------------------------------------------------------

  async claimNotification(key: string) {
    if (this.notifications.has(key)) return false;
    this.notifications.add(key);
    return true;
  }
}
