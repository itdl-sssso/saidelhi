// Centre admin (spec 35): scoped list, profile edits with optimistic version, photos,
// public-phone guard, slug rules. Public pages are revalidated after every change.
import type { CentreAdmin, CentreAdminRow, CentreInput, CentrePatch, CentresAdminQuery, Gathering, Media, Paged, PhotoUploadForm } from "@/contract";
import { UPLOAD_LIMITS } from "@/contract";
import { auditRec, diff } from "../../audit";
import { type Actor, assertCan } from "../../auth/rbac";
import { newId } from "../../db/columns";
import { toIso } from "../../domain/time";
import { ApiError } from "../../http/errors";
import { sniffImage } from "../../images";
import type { CentreRec, GatheringRec } from "../../repo/types";
import { phoneHash, normalisePhone } from "../../security/phone";
import { i18n, type OrgIndex } from "../org-index";
import { loadOrg, type PortalCtx } from "./shared";

export interface CentresAdminService {
  list(actor: Actor, q: CentresAdminQuery): Promise<Paged<CentreAdminRow>>;
  get(actor: Actor, id: string): Promise<CentreAdmin>;
  create(actor: Actor, body: CentreInput): Promise<CentreAdmin>;
  patch(actor: Actor, id: string, body: CentrePatch): Promise<CentreAdmin>;
  uploadPhoto(actor: Actor, id: string, file: { name: string; bytes: Uint8Array }, form: PhotoUploadForm): Promise<Media>;
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70) || "centre";

const fold = (s: string) => s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function createCentresAdminService(ctx: PortalCtx): CentresAdminService {
  const { repo, deps } = ctx;
  const now = () => deps.now();

  const inScope = (a: Actor, samithiId: string) => a.all || a.unitIds.has(samithiId);

  async function centreOr404(actor: Actor, id: string): Promise<CentreRec> {
    const c = (await repo.centres()).find((x) => x.id === id);
    if (!c || !inScope(actor, c.samithiId)) throw new ApiError("NOT_FOUND");
    return c;
  }

  function toGatherings(centreId: string, schedule: readonly Gathering[]): GatheringRec[] {
    return schedule.map((g, i) => ({ id: newId(), centreId, day: g.day, time: g.time, kind: g.kind, language: g.language, sortOrder: i }));
  }

  async function toAdmin(c: CentreRec, org: OrgIndex): Promise<CentreAdmin> {
    const g = await repo.gatherings([c.id]);
    const districtId = org.districtIdOf(c.samithiId) ?? "";
    return {
      id: c.id,
      slug: c.slug,
      samithiId: c.samithiId,
      district: org.ref(districtId),
      samithi: org.ref(c.samithiId),
      name: i18n(c.nameEn, c.nameHi),
      address: i18n(c.addressEn, c.addressHi),
      pincode: c.pincode,
      geo: c.lat !== null && c.lng !== null ? { lat: c.lat, lng: c.lng } : null,
      contactPhone: c.contactPhone,
      schedule: [...g]
        .sort((a, b) => a.sortOrder - b.sortOrder || a.day - b.day || a.time.localeCompare(b.time))
        .map((x) => ({ day: x.day, time: x.time, kind: x.kind, language: x.language })),
      photos: c.photos,
      active: c.active,
      publicPath: `/centres/${c.slug}`,
      updatedAt: toIso(c.updatedAt ?? now()),
      version: c.version ?? 1,
    };
  }

  /** A centre number must never be a portal user's own phone. */
  async function assertPublicPhone(phone: string | null | undefined) {
    if (!phone) return;
    const e164 = normalisePhone(phone);
    if (!e164) return;
    if (await repo.portal.userByPhoneHash(phoneHash(deps.secret, e164))) {
      throw new ApiError("VALIDATION_FAILED", { fields: { contactPhone: "This is a personal number. Use the centre's own public number." } });
    }
  }

  async function uniqueSlug(base: string, exceptId?: string): Promise<string> {
    const taken = new Set((await repo.centres()).filter((c) => c.id !== exceptId).map((c) => c.slug));
    if (!taken.has(base)) return base;
    for (let i = 2; i < 100; i++) if (!taken.has(`${base}-${i}`)) return `${base}-${i}`;
    return `${base}-${newId().slice(-6).toLowerCase()}`;
  }

  return {
    async list(actor, q) {
      assertCan(actor, "centres.manage");
      const org = await loadOrg(repo);
      const needle = q.q ? fold(q.q) : null;
      const all = (await repo.centres())
        .filter((c) => inScope(actor, c.samithiId))
        .filter((c) => q.active === undefined || c.active === q.active)
        .filter((c) => !q.district || org.districtIdOf(c.samithiId) === q.district)
        .filter((c) => !needle || [c.nameEn, c.nameHi, c.slug, org.get(c.samithiId)?.nameEn].some((s) => s && fold(s).includes(needle)))
        .sort((a, b) => a.nameEn.localeCompare(b.nameEn));
      const page = all.slice((q.page - 1) * q.pageSize, q.page * q.pageSize);
      const g = page.length ? await repo.gatherings(page.map((c) => c.id)) : [];
      return {
        data: page.map((c) => ({
          id: c.id,
          slug: c.slug,
          name: i18n(c.nameEn, c.nameHi),
          district: org.ref(org.districtIdOf(c.samithiId) ?? ""),
          samithi: org.ref(c.samithiId),
          active: c.active,
          hasGeo: c.lat !== null && c.lng !== null,
          hasPhone: !!c.contactPhone,
          gatherings: g.filter((x) => x.centreId === c.id).length,
          photos: c.photos.length,
          languages: { en: true, hi: !!c.nameHi?.trim() && !!c.addressHi?.trim() },
          updatedAt: toIso(c.updatedAt ?? now()),
        })),
        meta: { page: q.page, pageSize: q.pageSize, total: all.length },
      };
    },

    async get(actor, id) {
      assertCan(actor, "centres.manage");
      return toAdmin(await centreOr404(actor, id), await loadOrg(repo));
    },

    async create(actor, body) {
      assertCan(actor, "centres.manage");
      const org = await loadOrg(repo);
      const samithi = org.get(body.samithiId);
      if (!samithi || samithi.kind !== "samithi" || !inScope(actor, samithi.id)) throw new ApiError("NOT_FOUND");
      await assertPublicPhone(body.contactPhone);
      let slug: string;
      if (body.slug) {
        if ((await repo.centres()).some((c) => c.slug === body.slug)) throw new ApiError("VALIDATION_FAILED", { fields: { slug: "This address is already used by another centre." } });
        slug = body.slug;
      } else slug = await uniqueSlug(slugify(body.name.en));
      const id = newId();
      const rec: CentreRec = {
        id,
        slug,
        samithiId: samithi.id,
        nameEn: body.name.en,
        nameHi: body.name.hi?.trim() || null,
        addressEn: body.address.en,
        addressHi: body.address.hi?.trim() || null,
        pincode: body.pincode ?? null,
        lat: body.geo?.lat ?? null,
        lng: body.geo?.lng ?? null,
        contactPhone: body.contactPhone ?? null,
        photos: body.photos ?? [],
        active: true,
        version: 1,
        updatedAt: now(),
      };
      const res = await repo.m6.centreInsert(rec, toGatherings(id, body.schedule ?? []), [
        auditRec(actor, { action: "centre.create", entity: "centre", entityId: id, scopeId: samithi.id, data: { name: rec.nameEn, slug } }),
      ]);
      if (res === "duplicate") throw new ApiError("CONFLICT", { message: "A centre with this address already exists." });
      deps.revalidate(["centres", "events"]);
      return toAdmin((await repo.centres()).find((c) => c.id === id)!, org);
    },

    async patch(actor, id, body) {
      assertCan(actor, "centres.manage");
      const cur = await centreOr404(actor, id);
      if ((cur.version ?? 1) !== body.version) throw new ApiError("CONFLICT");
      if (body.contactPhone !== undefined && body.contactPhone !== cur.contactPhone) await assertPublicPhone(body.contactPhone);
      const patch: Partial<Omit<CentreRec, "id" | "version" | "updatedAt">> = {};
      if (body.name) {
        patch.nameEn = body.name.en;
        patch.nameHi = body.name.hi?.trim() || null;
      }
      if (body.address) {
        patch.addressEn = body.address.en;
        patch.addressHi = body.address.hi?.trim() || null;
      }
      if (body.pincode !== undefined) patch.pincode = body.pincode;
      if (body.geo !== undefined) {
        patch.lat = body.geo?.lat ?? null;
        patch.lng = body.geo?.lng ?? null;
      }
      if (body.contactPhone !== undefined) patch.contactPhone = body.contactPhone;
      if (body.photos) patch.photos = body.photos;
      if (body.active !== undefined) patch.active = body.active;
      const before = { name: cur.nameEn, address: cur.addressEn, pincode: cur.pincode, phone: cur.contactPhone ? "set" : null, photos: cur.photos.length, active: cur.active };
      const after = { ...before, ...(body.name ? { name: body.name.en } : {}), ...(body.address ? { address: body.address.en } : {}), ...(body.pincode !== undefined ? { pincode: body.pincode } : {}), ...(body.contactPhone !== undefined ? { phone: body.contactPhone ? "set" : null } : {}), ...(body.photos ? { photos: body.photos.length } : {}), ...(body.active !== undefined ? { active: body.active } : {}) };
      const res = await repo.m6.centreUpdate(id, patch, body.schedule ? toGatherings(id, body.schedule) : null, body.version, [
        auditRec(actor, { action: "centre.update", entity: "centre", entityId: id, scopeId: cur.samithiId, data: { ...diff(before, after), schedule: !!body.schedule } }),
      ]);
      if (res === "conflict") throw new ApiError("CONFLICT");
      if (res === "duplicate") throw new ApiError("CONFLICT");
      deps.revalidate(["centres", "events"]);
      return toAdmin((await repo.centres()).find((c) => c.id === id)!, await loadOrg(repo));
    },

    async uploadPhoto(actor, id, file, form) {
      assertCan(actor, "centres.manage");
      const c = await centreOr404(actor, id);
      if (file.bytes.byteLength > UPLOAD_LIMITS.photoBytes) throw new ApiError("VALIDATION_FAILED", { fields: { file: "The photo is larger than 8 MB." } });
      const info = sniffImage(file.bytes);
      if (!info) throw new ApiError("VALIDATION_FAILED", { fields: { file: "Use a JPG, PNG or WebP photo." } });
      const rel = `centres/${c.id}/${newId().toLowerCase()}.${info.ext}`;
      await deps.publicMedia.put(rel, file.bytes);
      await repo.portal.insertAudit(auditRec(actor, { action: "centre.photo", entity: "centre", entityId: c.id, scopeId: c.samithiId, data: { bytes: file.bytes.byteLength } }));
      return { url: `${deps.mediaBase.replace(/\/$/, "")}/${rel}`, width: info.width, height: info.height, alt: { en: form.alt, hi: null } };
    },
  };
}
