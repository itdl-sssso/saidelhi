// Coordinator portal DTOs, queries and bodies (§5.4: overview, events, links,
// approvals, org, people, audit). Lists use the §2 envelope; some carry extra
// `meta` keys (tab counts) documented per schema.
import { z } from "zod";
import { ScopeRef } from "./auth";
import { ErrorCode } from "./errors";
import { EventStatus, LinkPurpose, LinkState, OrgUnitKind, Role, SevaType, Source, TimelineChannel } from "./enums";
import { FormLink } from "./events";
import { KpiTile } from "./impact";
import { Geo, I18nText, ISODate, ISODateTime, Id, Locale, MaskedPhone, PageMeta, UnitRef } from "./primitives";
import { opt, Pagination, QueryBool, Slug } from "./queries";

// ---- Enums ------------------------------------------------------------------

export const ApprovalKind = z.enum(["plan", "report"]);
export type ApprovalKind = z.infer<typeof ApprovalKind>;

export const ApprovalState = z.enum(["pending", "approved", "changes_requested", "escalated"]);
export type ApprovalState = z.infer<typeof ApprovalState>;

export const UserStatus = z.enum(["active", "invited", "deactivated"]);
export type UserStatus = z.infer<typeof UserStatus>;

/** `POST /admin/events/:id/<action>`. */
export const EventAction = z.enum(["submit", "approve-plan", "approve-report", "request-changes", "cancel", "postpone", "reopen"]);
export type EventAction = z.infer<typeof EventAction>;

export const IdList = z.array(Id).min(1).max(100);

// ---- Events -----------------------------------------------------------------

/** Row of the events table, approvals cards and overview lists. */
export const EventRow = z.object({
  id: Id,
  title: I18nText,
  sevaType: SevaType,
  status: EventStatus,
  startsAt: ISODateTime,
  endsAt: ISODateTime.nullable(),
  postponedTo: ISODateTime.nullable(),
  venueName: z.string(),
  samithi: UnitRef,
  district: UnitRef,
  source: Source,
  reportDueAt: ISODateTime.nullable(),
  /** Whole days past `reportDueAt` while awaiting a report; null when not overdue. */
  overdueDays: z.number().int().positive().nullable(),
  lastActivityAt: ISODateTime,
  selfApproved: z.boolean(),
  version: z.number().int().positive(),
});
export type EventRow = z.infer<typeof EventRow>;

export const EventsTab = z.union([z.literal("all"), EventStatus]);
export type EventsTab = z.infer<typeof EventsTab>;

/** `meta.counts` keys: `all` and every EventStatus (scope + filters applied, status tab ignored). */
export const AdminEventsMeta = PageMeta.extend({ counts: z.record(z.string(), z.number().int().nonnegative()) });
export type AdminEventsMeta = z.infer<typeof AdminEventsMeta>;

export const AdminEventsQuery = Pagination.extend({
  status: opt(EventsTab),
  from: opt(ISODate),
  to: opt(ISODate),
  sevaType: opt(SevaType),
  district: opt(Id),
  samithi: opt(Id),
  source: opt(Source),
  overdue: opt(QueryBool),
  sort: opt(z.enum(["startsAt", "-startsAt", "updatedAt", "-updatedAt"])),
});
export type AdminEventsQuery = z.infer<typeof AdminEventsQuery>;

const Text = (max: number) => z.string().trim().max(max);

/** POST /admin/events. `submit: true` sends it for approval (district planners self-approve). */
export const EventInput = z.object({
  sevaType: SevaType,
  title: z.object({ en: Text(200).min(1), hi: Text(200).nullable().default(null) }),
  startsAt: ISODateTime,
  endsAt: ISODateTime.nullable().default(null),
  samithiId: Id,
  venueName: Text(200).min(1),
  venueAddress: Text(400).default(""),
  geo: Geo.nullable().default(null),
  partnerId: Id.nullable().default(null),
  volunteersNeeded: z.number().int().min(0).max(10_000).nullable().default(null),
  bring: z.array(z.object({ en: Text(200).min(1), hi: Text(200).nullable() })).max(20).default([]),
  /** Both languages are required before submit (spec 27). */
  description: z.object({ en: Text(4000), hi: Text(4000).nullable() }).default({ en: "", hi: null }),
  recurring: z.boolean().default(false),
  submit: z.boolean().default(false),
});
export type EventInput = z.input<typeof EventInput>;
export type EventInputParsed = z.output<typeof EventInput>;

/** PATCH /admin/events/:id — any subset of the plan fields plus the current `version`. */
export const EventPatch = z
  .object({
    sevaType: SevaType,
    title: z.object({ en: Text(200).min(1), hi: Text(200).nullable() }),
    startsAt: ISODateTime,
    endsAt: ISODateTime.nullable(),
    samithiId: Id,
    venueName: Text(200).min(1),
    venueAddress: Text(400),
    geo: Geo.nullable(),
    partnerId: Id.nullable(),
    volunteersNeeded: z.number().int().min(0).max(10_000).nullable(),
    bring: z.array(z.object({ en: Text(200).min(1), hi: Text(200).nullable() })).max(20),
    description: z.object({ en: Text(4000), hi: Text(4000).nullable() }),
    recurring: z.boolean(),
  })
  .partial()
  .extend({ version: z.number().int().positive() });
export type EventPatch = z.infer<typeof EventPatch>;

/**
 * Body of every event action. `version` (optional) guards against stale screens;
 * `reason` is required for request-changes; `postponedTo` optional for postpone.
 */
export const EventActionBody = z.object({
  version: z.number().int().positive().optional(),
  reason: Text(1000).min(1).optional(),
  postponedTo: ISODateTime.nullable().optional(),
});
export type EventActionBody = z.infer<typeof EventActionBody>;

export const EventActionParams = z.object({ id: Id, action: EventAction });

/** POST /admin/events/bulk/resend-links */
export const BulkResendLinks = z.object({ eventIds: IdList });
export type BulkResendLinks = z.infer<typeof BulkResendLinks>;

export const BulkResendResult = z.object({
  results: z.array(z.object({ eventId: Id, resent: z.number().int().nonnegative(), skipped: z.number().int().nonnegative() })),
});
export type BulkResendResult = z.infer<typeof BulkResendResult>;

/** Result of bulk actions: ids done, the rest with an error code. */
export const BulkResult = z.object({
  done: z.array(Id),
  failed: z.array(z.object({ id: Id, code: ErrorCode, message: z.string() })),
});
export type BulkResult = z.infer<typeof BulkResult>;

// ---- Overview ---------------------------------------------------------------

export const NeedKey = z.enum([
  "plans_to_approve",
  "reports_to_approve",
  "escalations",
  "reports_overdue",
  "awaiting_report",
  "drafts",
  "changes_requested",
  "inbox",
]);
export type NeedKey = z.infer<typeof NeedKey>;

/** One "Needs you" row: count, label and the portal path it opens (already filtered). */
export const NeedItem = z.object({
  key: NeedKey,
  count: z.number().int().positive(),
  label: I18nText,
  href: z.string(),
  /** Events behind the row, for inline actions such as "Resend link". */
  eventIds: z.array(Id),
});
export type NeedItem = z.infer<typeof NeedItem>;

export const SevaTypeCount = z.object({ sevaType: SevaType, label: I18nText, icon: z.string(), count: z.number().int().nonnegative() });
export type SevaTypeCount = z.infer<typeof SevaTypeCount>;

/** GET /admin/overview?scope= */
export const OverviewPayload = z.object({
  scope: ScopeRef.nullable(),
  today: ISODate,
  needsYou: z.array(NeedItem),
  /** activities, people_served, volunteer_hours, reporting_rate (%) — this month, internal (no suppression). */
  kpis: z.array(KpiTile).length(4),
  upcoming: z.array(EventRow),
  bySevaType: z.array(SevaTypeCount),
  /** No events at all in scope yet → onboarding checklist. */
  firstRun: z.boolean(),
});
export type OverviewPayload = z.infer<typeof OverviewPayload>;

export const OverviewQuery = z.object({ scope: opt(Id) });

// ---- Approvals --------------------------------------------------------------

export const ApprovalsTab = z.enum(["plans", "reports", "escalated"]);
export type ApprovalsTab = z.infer<typeof ApprovalsTab>;

export const KeyNumber = z.object({ key: z.string(), label: I18nText, value: z.number().nullable() });
export type KeyNumber = z.infer<typeof KeyNumber>;

export const ApprovalCard = z.object({
  id: Id,
  kind: ApprovalKind,
  state: ApprovalState,
  event: EventRow,
  requestedAt: ISODateTime,
  requestedBy: z.object({ label: z.string(), phone: MaskedPhone.nullable() }).nullable(),
  /** Channel of the request (where it was submitted). */
  channel: TimelineChannel.nullable(),
  waitingDays: z.number().int().nonnegative(),
  /** When a pending approval passes to the state team; null once escalated. */
  escalatesAt: ISODateTime.nullable(),
  /** Reports: the headline numbers from the submitted form (internal, unsuppressed). */
  keyNumbers: z.array(KeyNumber),
});
export type ApprovalCard = z.infer<typeof ApprovalCard>;

/** `meta.counts`: { plans, reports, escalated } in the viewer's scope. */
export const ApprovalsMeta = PageMeta.extend({ counts: z.record(ApprovalsTab, z.number().int().nonnegative()) });
export type ApprovalsMeta = z.infer<typeof ApprovalsMeta>;

export const ApprovalsQuery = Pagination.extend({ tab: opt(ApprovalsTab) });
export type ApprovalsQuery = z.infer<typeof ApprovalsQuery>;

/** POST /admin/approvals/bulk — plans only (reports are approved one by one). */
export const ApprovalsBulk = z.object({ ids: IdList, action: z.literal("approve") });
export type ApprovalsBulk = z.infer<typeof ApprovalsBulk>;

// ---- Links ------------------------------------------------------------------

export const LinkEventRef = z.object({
  id: Id,
  title: I18nText,
  startsAt: ISODateTime,
  status: EventStatus,
  samithi: UnitRef,
  district: UnitRef,
});
export type LinkEventRef = z.infer<typeof LinkEventRef>;

/** FormLink as listed on /admin/links. */
export const FormLinkAdmin = FormLink.extend({
  event: LinkEventRef,
  createdAt: ISODateTime,
  /** Active and expiring within 48 hours. */
  expiringSoon: z.boolean(),
});
export type FormLinkAdmin = z.infer<typeof FormLinkAdmin>;

export const LinksFilterState = z.union([LinkState, z.literal("expiring")]);

export const AdminLinksQuery = Pagination.extend({
  state: opt(LinksFilterState),
  purpose: opt(LinkPurpose),
  district: opt(Id),
  event: opt(Id),
});
export type AdminLinksQuery = z.infer<typeof AdminLinksQuery>;

/** `meta.expiringSoon`: active links in scope expiring within 48 h (callout). */
export const AdminLinksMeta = PageMeta.extend({ expiringSoon: z.number().int().nonnegative() });
export type AdminLinksMeta = z.infer<typeof AdminLinksMeta>;

/** POST /admin/events/:id/links */
export const LinkCreate = z.object({
  purpose: LinkPurpose,
  label: Text(120).min(1).optional(),
  /** Phone (sent on WhatsApp) or 'qr' (printed poster). */
  sendTo: z.union([z.literal("qr"), Text(20).min(8)]).optional(),
  expiresAt: ISODateTime.optional(),
  maxUses: z.number().int().positive().max(10_000).nullable().optional(),
  otpRequired: z.boolean().optional(),
  lang: Locale.optional(),
});
export type LinkCreate = z.infer<typeof LinkCreate>;

export const LinkExtend = z.object({ expiresAt: ISODateTime });
export type LinkExtend = z.infer<typeof LinkExtend>;

export const LinkResend = z.object({ lang: Locale.optional() });
export type LinkResend = z.infer<typeof LinkResend>;

// ---- Org --------------------------------------------------------------------

export type OrgTreeNode = {
  id: string;
  code: string;
  kind: OrgUnitKind;
  name: I18nText;
  slug: string;
  parentId: string | null;
  active: boolean;
  mergedIntoId: string | null;
  version: number;
  counts: { samithis: number; events: number; people: number };
  children: OrgTreeNode[];
};

export const OrgTreeNode: z.ZodType<OrgTreeNode> = z.lazy(() =>
  z.object({
    id: Id,
    code: z.string(),
    kind: OrgUnitKind,
    name: I18nText,
    slug: z.string(),
    parentId: Id.nullable(),
    active: z.boolean(),
    mergedIntoId: Id.nullable(),
    version: z.number().int().positive(),
    counts: z.object({ samithis: z.number().int().nonnegative(), events: z.number().int().nonnegative(), people: z.number().int().nonnegative() }),
    children: z.array(OrgTreeNode),
  }),
);

export const OrgCode = z.string().trim().regex(/^[A-Z0-9][A-Z0-9-]{1,31}$/, "Use capitals, digits and dashes (e.g. S-MAYUR)");

/** POST /admin/org — codes are fixed once created. */
export const OrgCreate = z.object({
  kind: z.enum(["district", "samithi"]),
  code: OrgCode,
  name: z.object({ en: Text(160).min(1), hi: Text(160).nullable().default(null) }),
  slug: Slug.optional(),
  parentId: Id,
});
export type OrgCreate = z.input<typeof OrgCreate>;

/** PATCH /admin/org/:id — `code` is read-only (sending it is a 422). */
export const OrgPatch = z
  .object({
    name: z.object({ en: Text(160).min(1), hi: Text(160).nullable() }).optional(),
    parentId: Id.optional(),
    version: z.number().int().positive(),
  })
  .strict();
export type OrgPatch = z.infer<typeof OrgPatch>;

export const OrgMerge = z.object({ intoId: Id, version: z.number().int().positive() });
export type OrgMerge = z.infer<typeof OrgMerge>;

export const VersionBody = z.object({ version: z.number().int().positive() });
export type VersionBody = z.infer<typeof VersionBody>;

// ---- People -----------------------------------------------------------------

export const Person = z.object({
  id: Id,
  name: z.string(),
  phone: MaskedPhone,
  email: z.string().nullable(),
  locale: Locale,
  role: Role,
  scope: ScopeRef.nullable(),
  status: UserStatus,
  lastSignInAt: ISODateTime.nullable(),
  invitedAt: ISODateTime,
  version: z.number().int().positive(),
});
export type Person = z.infer<typeof Person>;

export const PeopleQuery = Pagination.extend({
  q: opt(z.string().trim().max(80)),
  role: opt(Role),
  status: opt(UserStatus),
  scope: opt(Id),
});
export type PeopleQuery = z.infer<typeof PeopleQuery>;

/** `meta.reviewDue`: active people in scope who haven't signed in for 90 days (access review banner). */
export const PeopleMeta = PageMeta.extend({ reviewDue: z.number().int().nonnegative() });
export type PeopleMeta = z.infer<typeof PeopleMeta>;

/** POST /admin/people/invite — sends the `invite_coordinator` WhatsApp template. */
export const PersonInvite = z.object({
  name: Text(120).min(1),
  phone: Text(20).min(8),
  email: z.email().max(254).nullable().default(null),
  role: Role,
  /** Org unit for the role; null for translators. */
  scopeId: Id.nullable(),
  locale: Locale.default("en"),
});
export type PersonInvite = z.input<typeof PersonInvite>;

export const PersonPatch = z.object({
  name: Text(120).min(1).optional(),
  email: z.email().max(254).nullable().optional(),
  locale: Locale.optional(),
  role: Role.optional(),
  scopeId: Id.nullable().optional(),
  version: z.number().int().positive(),
});
export type PersonPatch = z.infer<typeof PersonPatch>;

// ---- Audit ------------------------------------------------------------------

export const AuditEntry = z.object({
  id: Id,
  at: ISODateTime,
  actor: z.object({ id: Id.nullable(), name: z.string().nullable(), role: z.string().nullable() }),
  action: z.string(),
  entity: z.string(),
  entityId: z.string().nullable(),
  scopeId: Id.nullable(),
  requestId: z.string().nullable(),
  /** Before/after and other context; never raw phones. */
  data: z.record(z.string(), z.unknown()).nullable(),
});
export type AuditEntry = z.infer<typeof AuditEntry>;

export const AuditQuery = Pagination.extend({
  action: opt(z.string().trim().max(64)),
  entity: opt(z.string().trim().max(64)),
  entityId: opt(z.string().trim().max(64)),
  actor: opt(Id),
  from: opt(ISODate),
  to: opt(ISODate),
});
export type AuditQuery = z.infer<typeof AuditQuery>;

// ---- Jobs -------------------------------------------------------------------

export const CronJob = z.enum(["escalations", "report-reminders", "event-status"]);
export type CronJob = z.infer<typeof CronJob>;

export const JobResult = z.object({
  job: CronJob,
  at: ISODateTime,
  /** Rows changed (status moves). */
  changed: z.number().int().nonnegative(),
  /** WhatsApp messages sent. */
  notified: z.number().int().nonnegative(),
  ids: z.array(Id),
});
export type JobResult = z.infer<typeof JobResult>;
