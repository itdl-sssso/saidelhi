// Fictional portal users (one per role, plus edge cases) and the approval
// requests behind the seeded events. Phones are +91 90000 0000X; sealed with
// the secret, so they are built per environment.
import type { Locale, Role, UserStatus } from "@/contract";
import { istInstant } from "../../domain/time";
import type { ApprovalRec, RoleAssignmentRec, UserRec } from "../../repo/portal-types";
import { encryptField } from "../../security/crypto";
import { maskPhone, phoneHash } from "../../security/phone";
import { EVENT, USER } from "./events";
import { fx } from "./ids";
import { DISTRICT, NCR_ID, SAMITHI } from "./org";

const at = (date: string, time: string) => istInstant(date, time);
const CREATED = new Date("2026-09-01T04:30:00Z");

interface PersonSeed {
  id: string;
  n: number;
  name: string;
  role: Role;
  scopeId: string | null;
  status: UserStatus;
  email?: string;
  locale?: Locale;
  lastSignInAt?: Date;
}

const PEOPLE: readonly PersonSeed[] = [
  { id: USER.coordA, n: 1, name: "Coordinator A", role: "samithi_coord", scopeId: SAMITHI.mayurVihar, status: "active", locale: "hi", lastSignInAt: at("2026-10-20", "19:00") },
  { id: USER.districtB, n: 2, name: "District coordinator B", role: "district_coord", scopeId: DISTRICT.east, status: "active", email: "district.east@example.org", lastSignInAt: at("2026-10-21", "09:00") },
  { id: USER.stateC, n: 3, name: "State admin C", role: "state_admin", scopeId: NCR_ID, status: "active", email: "state.admin@example.org", lastSignInAt: at("2026-10-21", "18:00") },
  { id: USER.contentD, n: 4, name: "Content editor D", role: "content_editor", scopeId: NCR_ID, status: "active", lastSignInAt: at("2026-10-12", "11:00") },
  { id: USER.translatorE, n: 5, name: "Translator E", role: "translator", scopeId: null, status: "active", locale: "hi", lastSignInAt: at("2026-06-01", "11:00") },
  { id: USER.piiF, n: 6, name: "PII officer F", role: "pii_officer", scopeId: NCR_ID, status: "active", lastSignInAt: at("2026-10-01", "11:00") },
  { id: USER.districtG, n: 7, name: "District coordinator G", role: "district_coord", scopeId: DISTRICT.north, status: "active", lastSignInAt: at("2026-10-18", "11:00") },
  { id: USER.coordH, n: 8, name: "Coordinator H", role: "samithi_coord", scopeId: SAMITHI.laxmiNagar, status: "active", lastSignInAt: at("2026-10-21", "10:00") },
  { id: USER.coordI, n: 9, name: "Coordinator I", role: "samithi_coord", scopeId: SAMITHI.preetVihar, status: "invited" },
  { id: USER.formerJ, n: 0, name: "Former coordinator J", role: "samithi_coord", scopeId: SAMITHI.rohini, status: "deactivated", lastSignInAt: at("2026-03-01", "11:00") },
];

export const devUserPhone = (n: number) => `+91900000000${n}`;

export interface PortalFixtures {
  users: UserRec[];
  roles: RoleAssignmentRec[];
  approvals: ApprovalRec[];
}

const approval = (
  n: number,
  eventId: string,
  kind: ApprovalRec["kind"],
  state: ApprovalRec["state"],
  requestedAt: Date,
  requestedByLabel: string,
  extra: Partial<ApprovalRec> = {},
): ApprovalRec => ({
  id: fx("APR", n),
  eventId,
  kind,
  state,
  requestedAt,
  requestedBy: null,
  requestedByLabel,
  requestChannel: "whatsapp",
  decidedBy: null,
  decidedAt: null,
  channel: null,
  reason: null,
  escalatedAt: null,
  selfApproved: false,
  ...extra,
});

export function portalFixtures(secret: string): PortalFixtures {
  const users: UserRec[] = PEOPLE.map((p) => {
    const phone = devUserPhone(p.n);
    return {
      id: p.id,
      name: p.name,
      phoneEnc: encryptField(secret, phone),
      phoneHash: phoneHash(secret, phone),
      phoneMasked: maskPhone(phone),
      email: p.email ?? null,
      locale: p.locale ?? "en",
      status: p.status,
      lastSignInAt: p.lastSignInAt ?? null,
      invitedBy: p.role === "state_admin" ? null : USER.stateC,
      createdAt: CREATED,
      version: 1,
    };
  });
  const roles: RoleAssignmentRec[] = PEOPLE.map((p, i) => ({
    id: fx("ROL", i + 1),
    userId: p.id,
    role: p.role,
    scopeId: p.scopeId,
    createdBy: p.role === "state_admin" ? null : USER.stateC,
    createdAt: CREATED,
    endedAt: null,
  }));
  const approvals: ApprovalRec[] = [
    approval(1, EVENT.awaitingApproval, "plan", "pending", at("2026-10-21", "10:00"), "Coordinator H", { requestedBy: USER.coordH, requestChannel: "portal" }),
    approval(2, EVENT.eyeMayurPlan, "plan", "pending", at("2026-10-20", "08:30"), "Coordinator A", { requestedBy: USER.coordA }),
    approval(3, EVENT.medicalSaketPlan, "plan", "pending", at("2026-10-18", "10:30"), "+91 90•••••31"),
    approval(4, EVENT.bloodRohiniPlan, "plan", "pending", at("2026-10-21", "15:30"), "+91 90•••••41", { requestChannel: "portal" }),
    approval(5, EVENT.balVikasRohiniEscalated, "plan", "escalated", at("2026-10-16", "12:00"), "+91 90•••••41", { escalatedAt: at("2026-10-19", "12:05") }),
    approval(6, EVENT.cleanMayurDraft, "plan", "changes_requested", at("2026-10-19", "18:05"), "Coordinator A", {
      requestedBy: USER.coordA,
      requestChannel: "portal",
      decidedBy: USER.districtB,
      decidedAt: at("2026-10-20", "09:00"),
      channel: "portal",
      reason: "Please add the Hindi description and the start time.",
    }),
    approval(7, EVENT.eyePreetReport, "report", "pending", at("2026-10-20", "11:30"), "Coordinator I", { requestChannel: "portal" }),
    approval(8, EVENT.cleanlinessSubmitted, "report", "pending", at("2026-10-13", "19:00"), "+91 90•••••51"),
    approval(9, EVENT.escalated, "report", "escalated", at("2026-10-08", "09:00"), "+91 90•••••61", { escalatedAt: at("2026-10-11", "09:00") }),
  ];
  return { users, roles, approvals };
}
