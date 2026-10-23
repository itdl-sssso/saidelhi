// Partner admin (spec 36): list with events-this-year, create/patch with a version guard.
// A partner with showPublicly=false never appears on public pages (see event-assembler, programs).
import type { Paged, PartnerAdmin, PartnerInput, PartnerPatch, PartnersQuery } from "@/contract";
import { auditRec, diff } from "../../audit";
import { type Actor, assertCan } from "../../auth/rbac";
import { newId } from "../../db/columns";
import { istYear } from "../../domain/time";
import { ApiError } from "../../http/errors";
import type { PartnerRec } from "../../repo/types";
import type { PortalCtx } from "./shared";

export interface PartnersAdminService {
  list(actor: Actor, q: PartnersQuery): Promise<Paged<PartnerAdmin>>;
  create(actor: Actor, body: PartnerInput): Promise<PartnerAdmin>;
  patch(actor: Actor, id: string, body: PartnerPatch): Promise<PartnerAdmin>;
}

const fold = (s: string) => s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function createPartnersAdminService(ctx: PortalCtx): PartnersAdminService {
  const { repo, deps } = ctx;

  async function counts() {
    const year = istYear(deps.now());
    return repo.m6.eventCountsByPartner(new Date(`${year}-01-01T00:00:00+05:30`), new Date(`${year + 1}-01-01T00:00:00+05:30`));
  }

  const dto = (p: PartnerRec, n: Map<string, number>): PartnerAdmin => ({
    id: p.id,
    name: p.name,
    kind: p.kind,
    city: p.city,
    nameHi: p.nameHi ?? null,
    contact: p.contact ?? null,
    showPublicly: p.showPublicly ?? true,
    active: p.active,
    eventsThisYear: n.get(p.id) ?? 0,
    version: p.version ?? 1,
  });

  async function one(id: string) {
    const p = (await repo.m6.partnersAll()).find((x) => x.id === id);
    if (!p) throw new ApiError("NOT_FOUND");
    return p;
  }

  const sameName = async (name: string, exceptId?: string) => (await repo.m6.partnersAll()).some((p) => p.id !== exceptId && fold(p.name) === fold(name));

  return {
    async list(actor, q) {
      assertCan(actor, "partners.manage");
      const needle = q.q ? fold(q.q) : null;
      const rows = (await repo.m6.partnersAll())
        .filter((p) => q.active === undefined || p.active === q.active)
        .filter((p) => !q.kind || p.kind === q.kind)
        .filter((p) => !q.city || fold(p.city) === fold(q.city))
        .filter((p) => !needle || [p.name, p.nameHi, p.city].some((s) => s && fold(s).includes(needle)));
      const n = await counts();
      return { data: rows.slice((q.page - 1) * q.pageSize, q.page * q.pageSize).map((p) => dto(p, n)), meta: { page: q.page, pageSize: q.pageSize, total: rows.length } };
    },

    async create(actor, body) {
      assertCan(actor, "partners.manage");
      if (await sameName(body.name)) throw new ApiError("VALIDATION_FAILED", { fields: { name: "A partner with this name already exists." } });
      const rec: PartnerRec = {
        id: newId(),
        name: body.name,
        kind: body.kind,
        city: body.city,
        active: true,
        nameHi: body.nameHi?.trim() || null,
        contact: body.contact?.trim() || null,
        showPublicly: body.showPublicly ?? true,
        version: 1,
      };
      await repo.m6.partnerInsert(rec, [auditRec(actor, { action: "partner.create", entity: "partner", entityId: rec.id, data: { name: rec.name, kind: rec.kind } })]);
      deps.revalidate(["events"]);
      return dto(rec, new Map());
    },

    async patch(actor, id, body) {
      assertCan(actor, "partners.manage");
      const cur = await one(id);
      if ((cur.version ?? 1) !== body.version) throw new ApiError("CONFLICT");
      if (body.name && (await sameName(body.name, id))) throw new ApiError("VALIDATION_FAILED", { fields: { name: "A partner with this name already exists." } });
      const { version, ...rest } = body;
      const patch: Partial<Omit<PartnerRec, "id">> = { ...rest };
      if (rest.nameHi !== undefined) patch.nameHi = rest.nameHi?.trim() || null;
      if (rest.contact !== undefined) patch.contact = rest.contact?.trim() || null;
      const before = { name: cur.name, kind: cur.kind, city: cur.city, active: cur.active, showPublicly: cur.showPublicly ?? true };
      const res = await repo.m6.partnerUpdate(id, patch, version, [
        auditRec(actor, { action: "partner.update", entity: "partner", entityId: id, data: diff(before, { ...before, ...(rest as object) }) }),
      ]);
      if (res === "conflict") throw new ApiError("CONFLICT");
      deps.revalidate(["events"]);
      return dto(await one(id), await counts());
    },
  };
}
