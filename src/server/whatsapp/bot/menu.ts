import { can } from "../../auth/rbac";
import { decryptField } from "../../security/crypto";
import type { PersonRec } from "../../repo/portal-types";
import type { Role } from "@/contract";
import { COPY, LABEL } from "./copy";
import { buttons, list, resetFlow } from "./reply";
import type { BotDeps, Turn } from "./types";

const COORD_ROLES: ReadonlySet<Role> = new Set<Role>(["samithi_coord", "district_coord", "state_admin"]);

/** Registered coordinators get the work menu; everyone else the public one. */
export const isCoordinator = (t: Turn): boolean => !!t.actor && COORD_ROLES.has(t.actor.role);
export const canApprove = (t: Turn): boolean => !!t.actor && can(t.actor, "approvals.read") && can(t.actor, "events.approve");

export function showMenu(t: Turn, withIntro = true): void {
  resetFlow(t);
  if (isCoordinator(t) && t.actor) {
    const rows = [
      { id: "m:plan", title: LABEL.plan },
      { id: "m:report", title: LABEL.report },
      { id: "m:events", title: LABEL.events },
      ...(canApprove(t) ? [{ id: "m:approvals", title: LABEL.approvals }] : []),
      { id: "m:help", title: LABEL.help },
    ];
    list(t, withIntro ? COPY.menuCoordinator(t.actor.name) : COPY.menuNext, LABEL.menu, rows, LABEL.menu);
    return;
  }
  buttons(t, withIntro ? COPY.menuPublic : COPY.menuNext, [
    { id: "m:near", label: LABEL.near },
    { id: "m:join", label: LABEL.join },
    { id: "m:contact", label: LABEL.contact },
  ]);
}

/** Active people holding `role` at `unitId` (any unit when null). */
export async function holders(deps: BotDeps, role: Role, unitId: string | null): Promise<PersonRec[]> {
  const people = await deps.repo.portal.people();
  return people.filter((p) => p.role?.role === role && p.user.status !== "deactivated" && (unitId === null || p.role.scopeId === unitId));
}

export const phoneOf = (deps: BotDeps, p: PersonRec["user"]): string | null => decryptField(deps.secret, p.phoneEnc);
