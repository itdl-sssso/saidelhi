// People and access (spec 37): scoped list, WhatsApp invite, role/scope
// changes and deactivation (signs the person out at once).
import type { Locale, PeopleMeta, PeopleQuery, Person, PersonInvite, PersonPatch, Role, VersionBody } from "@/contract";
import { PersonInvite as PersonInviteSchema } from "@/contract";
import { newId } from "../../db/columns";
import { auditRec } from "../../audit";
import { type Actor, assertCan, ROLE_LABEL, ROLE_RANK } from "../../auth/rbac";
import { toIso, toIsoOrNull } from "../../domain/time";
import { ApiError } from "../../http/errors";
import type { PersonRec, RoleAssignmentRec, UserRec } from "../../repo/portal-types";
import { encryptField } from "../../security/crypto";
import { maskPhone, normalisePhone, phoneHash } from "../../security/phone";
import { i18n, type OrgIndex } from "../org-index";
import { DAY_MS, loadOrg, notify, pageOf, type PortalCtx, portalUrl } from "./shared";

export interface PeopleService {
  list(actor: Actor, q: PeopleQuery): Promise<{ data: Person[]; meta: PeopleMeta }>;
  invite(actor: Actor, body: PersonInvite): Promise<Person>;
  patch(actor: Actor, id: string, body: PersonPatch): Promise<Person>;
  deactivate(actor: Actor, id: string, body: Partial<VersionBody>): Promise<Person>;
}

const REVIEW_AFTER_MS = 90 * DAY_MS;

/** The org-unit kind each role must be scoped to (null = no scope). */
const SCOPE_KIND: Record<Role, "ncr" | "district" | "samithi" | null> = {
  state_admin: "ncr",
  content_editor: "ncr",
  pii_officer: "ncr",
  translator: null,
  district_coord: "district",
  samithi_coord: "samithi",
};

export function createPeopleService(ctx: PortalCtx): PeopleService {
  const { repo, deps } = ctx;

  const visible = (actor: Actor, p: PersonRec) => actor.all || (!!p.role?.scopeId && actor.unitIds.has(p.role.scopeId));

  function toPerson(p: PersonRec, org: OrgIndex): Person {
    const unit = p.role?.scopeId ? org.get(p.role.scopeId) : undefined;
    return {
      id: p.user.id,
      name: p.user.name,
      phone: p.user.phoneMasked,
      email: p.user.email,
      locale: p.user.locale,
      role: p.role?.role ?? "samithi_coord",
      scope: unit ? { id: unit.id, slug: unit.slug, name: i18n(unit.nameEn, unit.nameHi), kind: unit.kind } : null,
      status: p.user.status,
      lastSignInAt: toIsoOrNull(p.user.lastSignInAt),
      invitedAt: toIso(p.user.createdAt),
      version: p.user.version,
    };
  }

  /**
   * Role/scope pairs must match (district role → a district, …). State admins assign
   * anything; district coordinators only roles at or below theirs, inside their district.
   */
  function assertAssignable(actor: Actor, role: Role, scopeId: string | null, org: OrgIndex): string | null {
    const kind = SCOPE_KIND[role];
    let scope = scopeId;
    if (kind === "ncr" && !scope) scope = [...org.districts()][0]?.parentId ?? null;
    if (kind === null) scope = null;
    const unit = scope ? org.get(scope) : undefined;
    if (kind !== null && (!unit || unit.kind !== kind || !unit.active)) {
      throw new ApiError("VALIDATION_FAILED", { fields: { scopeId: `This role needs ${kind === "ncr" ? "Delhi NCR" : `a ${kind}`} as its scope.` } });
    }
    if (actor.all && actor.role === "state_admin") return scope;
    if (!actor.permissions.has("people.invite") || ROLE_RANK[role] > ROLE_RANK[actor.role] || !scope || !actor.unitIds.has(scope)) {
      throw new ApiError("FORBIDDEN", { message: "You can only give roles at or below your own, within your area." });
    }
    return scope;
  }

  async function personFor(actor: Actor, id: string): Promise<PersonRec> {
    const p = (await repo.portal.people()).find((x) => x.user.id === id);
    if (!p || !visible(actor, p)) throw new ApiError("NOT_FOUND");
    return p;
  }

  async function reload(id: string, org: OrgIndex): Promise<Person> {
    const p = (await repo.portal.people()).find((x) => x.user.id === id);
    if (!p) throw new ApiError("NOT_FOUND");
    return toPerson(p, org);
  }

  async function sendInvite(user: UserRec, role: Role, scopeName: string | null) {
    const label = (l: Locale) => `${ROLE_LABEL[role][l]}${scopeName ? ` (${scopeName})` : ""}`;
    await notify(ctx, [{ user, role: null }], "invite_coordinator", (l) => [label(l), portalUrl(ctx, "/login")]);
  }

  const auditPerson = (p: Pick<UserRec, "name" | "email" | "locale" | "status">, r: Pick<RoleAssignmentRec, "role" | "scopeId"> | null) => ({
    name: p.name,
    email: p.email,
    locale: p.locale,
    status: p.status,
    role: r?.role ?? null,
    scopeId: r?.scopeId ?? null,
  });

  return {
    async list(actor, q) {
      assertCan(actor, "people.read");
      const org = await loadOrg(repo);
      const now = deps.now();
      const mine = (await repo.portal.people()).filter((p) => visible(actor, p));
      const needle = q.q?.toLowerCase();
      const scopeIds = q.scope ? new Set(await repo.portal.descendantIds(q.scope)) : null;
      const rows = mine.filter(
        (p) =>
          (!needle || p.user.name.toLowerCase().includes(needle)) &&
          (!q.role || p.role?.role === q.role) &&
          (!q.status || p.user.status === q.status) &&
          (!scopeIds || (!!p.role?.scopeId && scopeIds.has(p.role.scopeId))),
      );
      const reviewDue = mine.filter((p) => p.user.status === "active" && (!p.user.lastSignInAt || now.getTime() - p.user.lastSignInAt.getTime() > REVIEW_AFTER_MS)).length;
      const page = pageOf(rows, q.page, q.pageSize);
      return { data: page.data.map((p) => toPerson(p, org)), meta: { ...page.meta, reviewDue } };
    },

    async invite(actor, raw) {
      assertCan(actor, "people.invite");
      const body = PersonInviteSchema.parse(raw);
      const org = await loadOrg(repo);
      const scope = assertAssignable(actor, body.role, body.scopeId, org);
      const e164 = normalisePhone(body.phone);
      if (!e164) throw new ApiError("VALIDATION_FAILED", { fields: { phone: "Enter a 10-digit mobile number." } });
      const hash = phoneHash(deps.secret, e164);
      const at = deps.now();
      const role: RoleAssignmentRec = { id: newId(), userId: "", role: body.role, scopeId: scope, createdBy: actor.userId, createdAt: at, endedAt: null };
      const existing = await repo.portal.userByPhoneHash(hash);
      let userId: string;
      if (existing) {
        // Office-bearer rotation: a deactivated person can be invited again.
        if (existing.status !== "deactivated") throw new ApiError("CONFLICT", { message: "This number is already registered.", fields: { phone: "Already registered" } });
        userId = existing.id;
        const res = await repo.portal.updateUser({
          userId,
          patch: { name: body.name, email: body.email, locale: body.locale, status: "invited" },
          newRole: { ...role, userId },
          audit: [auditRec(actor, { action: "person.invite", entity: "user", entityId: userId, scopeId: scope, data: { reinvited: true, after: auditPerson({ ...body, status: "invited" }, role) } })],
        });
        if (res === "conflict") throw new ApiError("CONFLICT");
      } else {
        userId = newId();
        const user: UserRec = {
          id: userId,
          name: body.name,
          phoneEnc: encryptField(deps.secret, e164),
          phoneHash: hash,
          phoneMasked: maskPhone(e164),
          email: body.email,
          locale: body.locale,
          status: "invited",
          lastSignInAt: null,
          invitedBy: actor.userId,
          createdAt: at,
          version: 1,
        };
        const res = await repo.portal.insertUser(user, { ...role, userId }, [
          auditRec(actor, { action: "person.invite", entity: "user", entityId: userId, scopeId: scope, data: { after: auditPerson(user, role), phone: user.phoneMasked } }),
        ]);
        if (res === "duplicate") throw new ApiError("CONFLICT", { message: "This number is already registered.", fields: { phone: "Already registered" } });
      }
      const user = await repo.portal.userById(userId);
      if (user) await sendInvite(user, body.role, scope ? (org.get(scope)?.nameEn ?? null) : null);
      return reload(userId, org);
    },

    async patch(actor, id, body) {
      assertCan(actor, "people.manage");
      const target = await personFor(actor, id);
      const org = await loadOrg(repo);
      const roleChange = (body.role !== undefined && body.role !== target.role?.role) || (body.scopeId !== undefined && body.scopeId !== target.role?.scopeId);
      if (roleChange && id === actor.userId) throw new ApiError("FORBIDDEN", { message: "Ask another admin to change your own role." });
      if (target.role && !(actor.all && actor.role === "state_admin") && ROLE_RANK[target.role.role] > ROLE_RANK[actor.role]) throw new ApiError("FORBIDDEN");
      let newRole: RoleAssignmentRec | undefined;
      if (roleChange) {
        const role = body.role ?? target.role?.role ?? "samithi_coord";
        const scope = assertAssignable(actor, role, body.scopeId !== undefined ? body.scopeId : (target.role?.scopeId ?? null), org);
        newRole = { id: newId(), userId: id, role, scopeId: scope, createdBy: actor.userId, createdAt: deps.now(), endedAt: null };
      }
      const patch: Partial<UserRec> = {};
      if (body.name !== undefined) patch.name = body.name;
      if (body.email !== undefined) patch.email = body.email;
      if (body.locale !== undefined) patch.locale = body.locale;
      const res = await repo.portal.updateUser({
        userId: id,
        expectVersion: body.version,
        patch,
        newRole,
        audit: [
          auditRec(actor, {
            action: roleChange ? "person.role_change" : "person.update",
            entity: "user",
            entityId: id,
            scopeId: newRole?.scopeId ?? target.role?.scopeId ?? null,
            data: { before: auditPerson(target.user, target.role), after: auditPerson({ ...target.user, ...patch }, newRole ?? target.role) },
          }),
        ],
      });
      if (res === "conflict") throw new ApiError("CONFLICT");
      return reload(id, org);
    },

    async deactivate(actor, id, body) {
      assertCan(actor, "people.manage");
      const target = await personFor(actor, id);
      if (id === actor.userId) throw new ApiError("FORBIDDEN", { message: "You can't deactivate yourself." });
      if (target.role && !(actor.all && actor.role === "state_admin") && ROLE_RANK[target.role.role] > ROLE_RANK[actor.role]) throw new ApiError("FORBIDDEN");
      if (target.user.status === "deactivated") throw new ApiError("CONFLICT", { message: "Already deactivated." });
      const at = deps.now();
      const res = await repo.portal.updateUser({
        userId: id,
        expectVersion: body.version,
        patch: { status: "deactivated" },
        revokeSessionsAt: at,
        audit: [auditRec(actor, { action: "person.deactivate", entity: "user", entityId: id, scopeId: target.role?.scopeId ?? null, data: { before: { status: target.user.status }, after: { status: "deactivated" }, sessionsRevoked: true } })],
      });
      if (res === "conflict") throw new ApiError("CONFLICT");
      return reload(id, await loadOrg(repo));
    },
  };
}
