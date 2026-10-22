// Storage port for the coordinator portal (M3): people, roles, sessions,
// approvals, audit, admin event writes and org edits. Implemented in memory
// (portal-mock.ts) and on MySQL (portal-db.ts). Multi-row writes are atomic.
import type { ApprovalKind, ApprovalState, EventStatus, Locale, Role, SevaType, Source, TimelineChannel, UserStatus } from "@/contract";
import type { AttachmentRec, LinkRec, SubmissionRec } from "./links-types";
import type { AuditRec, EventRec, KpiFactRec, OrgUnitRec, TimelineRec } from "./types";

export interface UserRec {
  id: string;
  name: string;
  phoneEnc: string;
  phoneHash: string;
  phoneMasked: string;
  email: string | null;
  locale: Locale;
  status: UserStatus;
  lastSignInAt: Date | null;
  invitedBy: string | null;
  createdAt: Date;
  version: number;
}

export interface RoleAssignmentRec {
  id: string;
  userId: string;
  role: Role;
  scopeId: string | null;
  createdBy: string | null;
  createdAt: Date;
  endedAt: Date | null;
}

/** A user with their current role assignment (null only for broken data). */
export interface PersonRec {
  user: UserRec;
  role: RoleAssignmentRec | null;
}

export interface SessionRec {
  id: string;
  userId: string;
  createdAt: Date;
  lastSeenAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
  ipHash: string | null;
  uaHint: string | null;
}

export interface ApprovalRec {
  id: string;
  eventId: string;
  kind: ApprovalKind;
  state: ApprovalState;
  requestedAt: Date;
  requestedBy: string | null;
  requestedByLabel: string | null;
  requestChannel: TimelineChannel | null;
  decidedBy: string | null;
  decidedAt: Date | null;
  channel: TimelineChannel | null;
  reason: string | null;
  escalatedAt: Date | null;
  selfApproved: boolean;
}

export interface AuditRow extends AuditRec {
  id: string;
  at: Date;
}

export interface AuditFilter {
  action?: string;
  entity?: string;
  entityId?: string;
  actorId?: string;
  from?: Date;
  to?: Date;
  limit: number;
  offset: number;
}

/** Admin event list filter: scope by samithi ids (undefined = everything). */
export interface AdminEventFilter {
  samithiIds?: readonly string[];
  statuses?: readonly EventStatus[];
  from?: Date;
  to?: Date;
  sevaType?: SevaType;
  districtId?: string;
  samithiId?: string;
  source?: Source;
  /** awaiting_report with report_due_at before this instant. */
  overdueBefore?: Date;
  sort: "startsAt" | "-startsAt" | "updatedAt" | "-updatedAt";
  limit: number;
  offset: number;
}

/** Event fields a portal write may change. */
export type EventPatchRec = Partial<
  Omit<EventRec, "id" | "version" | "updatedAt" | "volunteersJoined" | "resultsPhotos" | "createdBy" | "source">
>;

export interface TimelineWrite {
  status: TimelineRec["status"];
  at: Date;
  byRole: Role | null;
  byLabel: string | null;
  byUserId: string | null;
  channel: TimelineChannel | null;
  note: string | null;
}

/**
 * One atomic event mutation: version/status guard, field patch, timeline step,
 * approval changes, KPI fact and submission status changes, audit rows.
 */
export interface EventWrite {
  eventId: string;
  /** Becomes updated_at. */
  at: Date;
  /** Fails with "conflict" when the stored version differs. */
  expectVersion?: number;
  /** Fails with "conflict" when the stored status is not one of these. */
  expectStatuses?: readonly EventStatus[];
  patch: EventPatchRec;
  timeline: TimelineWrite[];
  approvalInsert?: ApprovalRec;
  /** Updates open approvals (state in `fromStates`) of the event, optionally of one kind. */
  approvalUpdate?: {
    kind?: ApprovalKind;
    fromStates: readonly ApprovalState[];
    set: Partial<Pick<ApprovalRec, "state" | "decidedBy" | "decidedAt" | "channel" | "reason" | "escalatedAt" | "selfApproved">>;
  };
  /** 'approve' stamps pending facts (approved_at); 'unapprove' clears them (reopen). */
  facts?: { op: "approve"; at: Date } | { op: "unapprove" };
  /** Status for the event's report submissions (and approved_at when approving). */
  submissions?: { status: SubmissionRec["status"]; approvedAt: Date | null };
  audit: AuditRec[];
}

export type WriteResult = "ok" | "conflict";

export interface NewEventWrite {
  event: EventRec;
  timeline: TimelineWrite[];
  approval: ApprovalRec | null;
  audit: AuditRec[];
}

export interface UserWrite {
  userId: string;
  expectVersion?: number;
  patch: Partial<Pick<UserRec, "name" | "email" | "locale" | "status" | "lastSignInAt">>;
  /** Ends the current assignment and starts this one. */
  newRole?: RoleAssignmentRec;
  revokeSessionsAt?: Date;
  audit: AuditRec[];
}

export interface OrgWrite {
  unitId: string;
  expectVersion: number;
  patch: Partial<Pick<OrgUnitRec, "nameEn" | "nameHi" | "parentId" | "active" | "mergedIntoId">>;
  /** Rebuild closure rows of the unit's subtree after a parent change. */
  reparent?: boolean;
  audit: AuditRec[];
}

export interface PortalRepo {
  // People
  userById(id: string): Promise<UserRec | null>;
  userByPhoneHash(hash: string): Promise<UserRec | null>;
  usersByIds(ids: readonly string[]): Promise<UserRec[]>;
  /** Every user with their current role (small table; filtered in services). */
  people(): Promise<PersonRec[]>;
  currentRole(userId: string): Promise<RoleAssignmentRec | null>;
  insertUser(user: UserRec, role: RoleAssignmentRec, audit: AuditRec[]): Promise<"ok" | "duplicate">;
  updateUser(w: UserWrite): Promise<WriteResult>;

  // Sessions
  insertSession(rec: SessionRec): Promise<void>;
  sessionById(id: string): Promise<SessionRec | null>;
  touchSession(id: string, lastSeenAt: Date, expiresAt: Date): Promise<void>;
  revokeSession(id: string, at: Date): Promise<void>;

  // Org
  /** Descendants of a unit including itself (org_closure). */
  descendantIds(unitId: string): Promise<string[]>;
  insertOrgUnit(unit: OrgUnitRec, audit: AuditRec[]): Promise<"ok" | "duplicate">;
  updateOrgUnit(w: OrgWrite): Promise<WriteResult>;

  // Events
  listAdminEvents(f: AdminEventFilter): Promise<{ rows: EventRec[]; total: number }>;
  /** Counts by status for the filter (its `statuses` ignored). */
  eventStatusCounts(f: Omit<AdminEventFilter, "statuses" | "sort" | "limit" | "offset">): Promise<Map<EventStatus, number>>;
  insertEvent(w: NewEventWrite): Promise<void>;
  writeEvent(w: EventWrite): Promise<WriteResult>;
  timelineFor(eventIds: readonly string[]): Promise<TimelineRec[]>;
  factsForEvents(eventIds: readonly string[]): Promise<KpiFactRec[]>;
  submissionsForEvent(eventId: string): Promise<SubmissionRec[]>;
  attachmentsForEvent(eventId: string): Promise<AttachmentRec[]>;
  attachmentById(id: string): Promise<AttachmentRec | null>;
  linksForEvents(eventIds: readonly string[]): Promise<(LinkRec & { createdAt: Date })[]>;

  // Approvals
  approvals(f: { states?: readonly ApprovalState[]; eventIds?: readonly string[]; kind?: ApprovalKind }): Promise<ApprovalRec[]>;

  // Audit
  insertAudit(rec: AuditRec): Promise<void>;
  listAudit(f: AuditFilter): Promise<{ rows: AuditRow[]; total: number }>;

  // Jobs
  /** Records a notification key; false when it was already recorded (send nothing). */
  claimNotification(key: string, kind: string, eventId: string | null, at: Date): Promise<boolean>;
}
