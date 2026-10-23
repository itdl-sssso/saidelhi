// Role → permissions (§3, §5.4) and the Actor every portal service receives.
import { PERMISSIONS, type Permission, type Role } from "@/contract";
import { ApiError } from "../http/errors";

const COORD_COMMON: readonly Permission[] = [
  "overview.read",
  "events.read",
  "events.plan",
  "links.read",
  "links.manage",
  "inbox.review",
  "uploads.manage",
  "org.read",
  "centres.manage",
  "volunteers.read",
  "attachments.read",
];

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  state_admin: PERMISSIONS,
  district_coord: [
    ...COORD_COMMON,
    "events.approve",
    "approvals.read",
    "approvals.decide",
    "org.manage",
    "people.read",
    "people.invite",
    "people.manage",
    "reports.export",
    "health.read",
    "whatsapp.reminders",
  ],
  samithi_coord: COORD_COMMON,
  content_editor: ["content.edit", "impact.manage", "partners.manage"],
  translator: ["discourses.edit"],
  pii_officer: ["followup.read", "followup.reveal", "privacy.manage", "audit.read"],
};

/** Roles ordered by reach: a district coordinator may assign roles at or below its own (spec 37). */
export const ROLE_RANK: Record<Role, number> = {
  state_admin: 3,
  content_editor: 3,
  pii_officer: 3,
  translator: 3,
  district_coord: 2,
  samithi_coord: 1,
};

/** Human label used on timelines and messages ("District coordinator B"). */
export const ROLE_LABEL: Record<Role, { en: string; hi: string }> = {
  state_admin: { en: "State admin", hi: "राज्य प्रशासक" },
  district_coord: { en: "District coordinator", hi: "ज़िला समन्वयक" },
  samithi_coord: { en: "Samithi coordinator", hi: "समिति समन्वयक" },
  content_editor: { en: "Content editor", hi: "सामग्री संपादक" },
  translator: { en: "Translator", hi: "अनुवादक" },
  pii_officer: { en: "Privacy officer", hi: "गोपनीयता अधिकारी" },
};

export interface RequestContext {
  requestId: string | null;
  ipHash: string | null;
}

/** Who is acting, with the org units they can see. */
export interface Actor {
  userId: string;
  name: string;
  role: Role;
  /** Org unit of the role (null for translators). */
  scopeId: string | null;
  /** NCR-wide reach: every unit, including ones created later. */
  all: boolean;
  /** Units in scope (scope unit and its descendants) when not `all`. */
  unitIds: ReadonlySet<string>;
  permissions: ReadonlySet<Permission>;
  ctx: RequestContext;
}

export const can = (a: Actor, p: Permission) => a.permissions.has(p);

/** 403 when the role lacks the permission (checked before scope, so it reveals nothing). */
export function assertCan(a: Actor, p: Permission): void {
  if (!a.permissions.has(p)) throw new ApiError("FORBIDDEN");
}

export const inScope = (a: Actor, unitId: string | null | undefined): boolean => !!unitId && (a.all || a.unitIds.has(unitId));

/** Out of scope is indistinguishable from missing (404). */
export function assertInScope(a: Actor, unitId: string | null | undefined): void {
  if (!inScope(a, unitId)) throw new ApiError("NOT_FOUND");
}

export function permissionsFor(role: Role): Permission[] {
  return [...ROLE_PERMISSIONS[role]];
}
