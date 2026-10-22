// Districts and samithis (spec 34): tree with counts, add, rename/move,
// merge and deactivate. Codes are immutable; nothing is ever deleted.
import type { OrgCreate, OrgMerge, OrgPatch, OrgTreeNode, VersionBody } from "@/contract";
import { OrgCreate as OrgCreateSchema } from "@/contract";
import { newId } from "../../db/columns";
import { auditRec } from "../../audit";
import { type Actor, assertCan, assertInScope } from "../../auth/rbac";
import { ApiError } from "../../http/errors";
import type { OrgUnitRec } from "../../repo/types";
import { loadOrg, type PortalCtx, scopeSamithiIds } from "./shared";

export interface OrgService {
  tree(actor: Actor): Promise<OrgTreeNode[]>;
  create(actor: Actor, body: OrgCreate): Promise<OrgTreeNode>;
  patch(actor: Actor, id: string, body: OrgPatch): Promise<OrgTreeNode>;
  merge(actor: Actor, id: string, body: OrgMerge): Promise<OrgTreeNode>;
  deactivate(actor: Actor, id: string, body: VersionBody): Promise<OrgTreeNode>;
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "unit";

export function createOrgService(ctx: PortalCtx): OrgService {
  const { repo } = ctx;

  async function build(actor: Actor): Promise<{ roots: OrgTreeNode[]; byId: Map<string, OrgTreeNode> }> {
    const org = await loadOrg(repo);
    const units = await repo.orgUnits();
    const [{ rows: events }, people] = await Promise.all([
      repo.portal.listAdminEvents({ samithiIds: scopeSamithiIds(actor, org), sort: "startsAt", limit: 100_000, offset: 0 }),
      repo.portal.people(),
    ]);
    const byId = new Map<string, OrgTreeNode>();
    for (const u of units) {
      byId.set(u.id, {
        id: u.id,
        code: u.code,
        kind: u.kind,
        name: { en: u.nameEn, hi: u.nameHi },
        slug: u.slug,
        parentId: u.parentId,
        active: u.active,
        mergedIntoId: u.mergedIntoId,
        version: u.version,
        counts: { samithis: 0, events: 0, people: 0 },
        children: [],
      });
    }
    const ancestors = (id: string): OrgTreeNode[] => {
      const out: OrgTreeNode[] = [];
      for (let n = byId.get(id); n; n = n.parentId ? byId.get(n.parentId) : undefined) out.push(n);
      return out;
    };
    for (const e of events) for (const n of ancestors(e.samithiId)) n.counts.events++;
    for (const p of people) {
      if (p.user.status === "deactivated" || !p.role?.scopeId) continue;
      for (const n of ancestors(p.role.scopeId)) n.counts.people++;
    }
    for (const u of units) {
      if (u.kind === "samithi" && u.active) for (const n of ancestors(u.id).slice(1)) n.counts.samithis++;
    }
    const sort = (a: OrgTreeNode, b: OrgTreeNode) => Number(b.active) - Number(a.active) || a.name.en.localeCompare(b.name.en);
    const sortOrder = new Map(units.map((u) => [u.id, u.sortOrder]));
    for (const n of byId.values()) if (n.parentId) byId.get(n.parentId)?.children.push(n);
    for (const n of byId.values()) n.children.sort((a, b) => (sortOrder.get(a.id) ?? 0) - (sortOrder.get(b.id) ?? 0) || sort(a, b));
    const visible = [...byId.values()].filter((n) => actor.all || actor.unitIds.has(n.id));
    const roots = visible.filter((n) => !n.parentId || !visible.some((v) => v.id === n.parentId));
    if (!actor.all) {
      const prune = (n: OrgTreeNode) => {
        n.children = n.children.filter((c) => actor.unitIds.has(c.id));
        n.children.forEach(prune);
      };
      roots.forEach(prune);
    }
    return { roots, byId };
  }

  async function nodeFor(actor: Actor, id: string): Promise<OrgTreeNode> {
    const { byId } = await build(actor);
    const n = byId.get(id);
    if (!n) throw new ApiError("NOT_FOUND");
    return n;
  }

  async function unitFor(actor: Actor, id: string): Promise<OrgUnitRec> {
    const u = (await repo.orgUnits()).find((x) => x.id === id);
    if (!u) throw new ApiError("NOT_FOUND");
    assertInScope(actor, u.id);
    // District coordinators manage their samithis, not their own district (spec 34).
    if (!actor.all && u.id === actor.scopeId) throw new ApiError("FORBIDDEN");
    return u;
  }

  const record = (u: OrgUnitRec) => ({ code: u.code, name: { en: u.nameEn, hi: u.nameHi }, parentId: u.parentId, active: u.active, mergedIntoId: u.mergedIntoId });

  return {
    async tree(actor) {
      assertCan(actor, "org.read");
      return (await build(actor)).roots;
    },

    async create(actor, raw) {
      assertCan(actor, "org.manage");
      const body = OrgCreateSchema.parse(raw);
      const units = await repo.orgUnits();
      const parent = units.find((u) => u.id === body.parentId);
      const wantParent = body.kind === "district" ? "ncr" : "district";
      if (body.kind === "district" && !actor.all) throw new ApiError("FORBIDDEN");
      if (!parent || parent.kind !== wantParent || !parent.active) {
        throw new ApiError("VALIDATION_FAILED", { fields: { parentId: body.kind === "district" ? "Districts sit under Delhi NCR." : "Choose an active district." } });
      }
      assertInScope(actor, parent.id);
      const unit: OrgUnitRec = {
        id: newId(),
        code: body.code,
        kind: body.kind,
        nameEn: body.name.en,
        nameHi: body.name.hi,
        slug: body.slug ?? slugify(body.name.en.replace(/^samithi\s+/i, "")),
        parentId: parent.id,
        introEn: null,
        introHi: null,
        sortOrder: 0,
        active: true,
        mergedIntoId: null,
        version: 1,
      };
      const res = await repo.portal.insertOrgUnit(unit, [
        auditRec(actor, { action: "org.create", entity: "org_unit", entityId: unit.id, scopeId: parent.id, data: { after: record(unit) } }),
      ]);
      if (res === "duplicate") throw new ApiError("CONFLICT", { message: "That code or slug is already in use.", fields: { code: "Already in use" } });
      // The actor's unit set was resolved before the unit existed.
      return nodeFor(actor.all ? actor : { ...actor, unitIds: new Set([...actor.unitIds, unit.id]) }, unit.id);
    },

    async patch(actor, id, body) {
      assertCan(actor, "org.manage");
      const u = await unitFor(actor, id);
      const patch: Partial<OrgUnitRec> = {};
      if (body.name) Object.assign(patch, { nameEn: body.name.en, nameHi: body.name.hi });
      let reparent = false;
      if (body.parentId && body.parentId !== u.parentId) {
        const parent = (await repo.orgUnits()).find((x) => x.id === body.parentId);
        if (u.kind !== "samithi" || !parent || parent.kind !== "district" || !parent.active) {
          throw new ApiError("VALIDATION_FAILED", { fields: { parentId: "Only samithis can move, to an active district." } });
        }
        if (!actor.all) throw new ApiError("VALIDATION_FAILED", { fields: { parentId: "Only the state team can move a samithi to another district." } });
        patch.parentId = parent.id;
        reparent = true;
      }
      const res = await repo.portal.updateOrgUnit({
        unitId: u.id,
        expectVersion: body.version,
        patch,
        reparent,
        audit: [auditRec(actor, { action: "org.update", entity: "org_unit", entityId: u.id, scopeId: u.parentId, data: { before: record(u), after: record({ ...u, ...patch }) } })],
      });
      if (res === "conflict") throw new ApiError("CONFLICT");
      ctx.deps.revalidate(["centres", "events"]);
      return nodeFor(actor, u.id);
    },

    async merge(actor, id, body) {
      assertCan(actor, "org.manage");
      const u = await unitFor(actor, id);
      const into = (await repo.orgUnits()).find((x) => x.id === body.intoId);
      if (!into || into.id === u.id || into.kind !== u.kind || !into.active || u.kind !== "samithi") {
        throw new ApiError("VALIDATION_FAILED", { fields: { intoId: "Choose another active samithi." } });
      }
      assertInScope(actor, into.id);
      if (!u.active) throw new ApiError("CONFLICT", { message: "This samithi is already inactive." });
      const res = await repo.portal.updateOrgUnit({
        unitId: u.id,
        expectVersion: body.version,
        patch: { active: false, mergedIntoId: into.id },
        audit: [auditRec(actor, { action: "org.merge", entity: "org_unit", entityId: u.id, scopeId: u.parentId, data: { into: into.id, intoCode: into.code, historyKept: true } })],
      });
      if (res === "conflict") throw new ApiError("CONFLICT");
      ctx.deps.revalidate(["centres"]);
      return nodeFor(actor, u.id);
    },

    async deactivate(actor, id, body) {
      assertCan(actor, "org.manage");
      const u = await unitFor(actor, id);
      if (u.kind === "ncr") throw new ApiError("FORBIDDEN");
      if (!u.active) throw new ApiError("CONFLICT", { message: "Already inactive." });
      if (u.kind === "district" && (await repo.orgUnits()).some((x) => x.parentId === u.id && x.active)) {
        throw new ApiError("CONFLICT", { message: "Deactivate or move its samithis first." });
      }
      const res = await repo.portal.updateOrgUnit({
        unitId: u.id,
        expectVersion: body.version,
        patch: { active: false },
        audit: [auditRec(actor, { action: "org.deactivate", entity: "org_unit", entityId: u.id, scopeId: u.parentId, data: { code: u.code, historyKept: true } })],
      });
      if (res === "conflict") throw new ApiError("CONFLICT");
      ctx.deps.revalidate(["centres"]);
      return nodeFor(actor, u.id);
    },
  };
}
