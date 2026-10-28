// Content types admin (v0.10): add / rename / reorder / deactivate article types. State admin only; every change audited.
import type { ContentTypeCreate, ContentTypePatch, ContentTypeReorder, ContentTypeRow } from "@/contract";
import type { z } from "zod";
import { auditRec } from "../../audit";
import { type Actor, assertCan } from "../../auth/rbac";
import { ApiError } from "../../http/errors";
import { slugify } from "./content";
import { type ContentTypeData, type ContentTypeDoc, contentTypeCounts, contentTypeDocs, DEFAULT_CONTENT_TYPES, toTypeRow } from "../content-types";
import type { PortalCtx } from "./shared";

type Create = z.output<typeof import("@/contract").ContentTypeCreate>;

export interface ContentTypesAdminService {
  list(actor: Actor): Promise<ContentTypeRow[]>;
  create(actor: Actor, body: Create): Promise<ContentTypeRow>;
  patch(actor: Actor, slug: string, body: ContentTypePatch): Promise<ContentTypeRow>;
  reorder(actor: Actor, body: ContentTypeReorder): Promise<ContentTypeRow[]>;
}
export type { ContentTypeCreate };

const keys = (d: ContentTypeData) => ({ id: d.slug, k1: d.active ? "1" : "0", k2: null });

export function createContentTypesAdminService(ctx: PortalCtx): ContentTypesAdminService {
  const { repo, deps } = ctx;

  async function rows(): Promise<ContentTypeRow[]> {
    const [{ docs }, counts] = await Promise.all([contentTypeDocs(repo), contentTypeCounts(repo)]);
    return docs.map((d) => toTypeRow(d, counts.get(d.data.slug) ?? 0));
  }

  /** First write saves the defaults so later edits have rows to version. */
  async function materialise(actor: Actor): Promise<ContentTypeDoc[]> {
    const { docs, stored } = await contentTypeDocs(repo);
    if (stored) return docs;
    for (const d of DEFAULT_CONTENT_TYPES) await repo.m6.docUpsert("content_type", { ...keys(d), data: d });
    void actor;
    return (await contentTypeDocs(repo)).docs;
  }

  const done = () => deps.revalidate?.(["articles", "home"]);

  return {
    async list(actor) {
      assertCan(actor, "content.edit");
      return rows();
    },

    async create(actor, body) {
      assertCan(actor, "content.types");
      const docs = await materialise(actor);
      const slug = body.slug ?? slugify(body.labelEn).slice(0, 40);
      if (!/^[a-z][a-z0-9_-]{1,39}$/.test(slug)) throw new ApiError("VALIDATION_FAILED", { fields: { labelEn: "Use letters and digits in the name." } });
      if (docs.some((d) => d.data.slug === slug)) throw new ApiError("VALIDATION_FAILED", { fields: { labelEn: "A type with this name already exists." } });
      if (docs.some((d) => d.data.labelEn.toLowerCase() === body.labelEn.toLowerCase())) throw new ApiError("VALIDATION_FAILED", { fields: { labelEn: "A type with this name already exists." } });
      const data: ContentTypeData = { slug, labelEn: body.labelEn.trim(), labelHi: body.labelHi?.trim() || null, active: true, order: Math.max(-1, ...docs.map((d) => d.data.order)) + 1 };
      const res = await repo.m6.docInsert("content_type", { ...keys(data), data }, [auditRec(actor, { action: "content_type.create", entity: "content_type", entityId: slug, data: { label: data.labelEn } })]);
      if (!res.ok) throw new ApiError("CONFLICT");
      done();
      return (await rows()).find((r) => r.slug === slug)!;
    },

    async patch(actor, slug, body) {
      assertCan(actor, "content.types");
      const docs = await materialise(actor);
      const cur = docs.find((d) => d.data.slug === slug);
      if (!cur) throw new ApiError("NOT_FOUND");
      if (cur.version !== body.version && !(body.version === 0 && cur.version === 1)) throw new ApiError("CONFLICT");
      const next: ContentTypeData = {
        ...cur.data,
        labelEn: body.labelEn?.trim() ?? cur.data.labelEn,
        labelHi: body.labelHi === undefined ? cur.data.labelHi : body.labelHi?.trim() || null,
        active: body.active ?? cur.data.active,
      };
      if (!next.active && cur.data.active && docs.filter((d) => d.data.active && d.data.slug !== slug).length === 0) {
        throw new ApiError("VALIDATION_FAILED", { fields: { active: "Keep at least one type active." } });
      }
      const changed = (["labelEn", "labelHi", "active"] as const).filter((k) => next[k] !== cur.data[k]);
      const res = await repo.m6.docUpdate("content_type", { ...keys(next), data: next }, cur.version, [
        auditRec(actor, { action: changed.includes("active") ? (next.active ? "content_type.activate" : "content_type.deactivate") : "content_type.update", entity: "content_type", entityId: slug, data: { fields: changed } }),
      ]);
      if (!res.ok) throw new ApiError("CONFLICT");
      done();
      return (await rows()).find((r) => r.slug === slug)!;
    },

    async reorder(actor, body) {
      assertCan(actor, "content.types");
      const docs = await materialise(actor);
      const known = new Set(docs.map((d) => d.data.slug));
      if (body.slugs.some((s) => !known.has(s)) || new Set(body.slugs).size !== body.slugs.length) throw new ApiError("VALIDATION_FAILED", { fields: { slugs: "Unknown or repeated type." } });
      const order = [...body.slugs, ...docs.map((d) => d.data.slug).filter((s) => !body.slugs.includes(s))];
      const moves = order.map((s, i) => ({ d: docs.find((x) => x.data.slug === s)!, i })).filter(({ d, i }) => d.data.order !== i);
      for (const [n, { d, i }] of moves.entries()) {
        const next = { ...d.data, order: i };
        const audit = n === moves.length - 1 ? [auditRec(actor, { action: "content_type.reorder", entity: "content_type", entityId: "list", data: { order } })] : undefined;
        await repo.m6.docUpdate("content_type", { ...keys(next), data: next }, d.version, audit);
      }
      done();
      return rows();
    },
  };
}
