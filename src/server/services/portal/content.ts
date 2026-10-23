// Content admin (spec 38): native articles with copy-on-write for legacy posts,
// thought-for-the-day / announcement / home-section items, thought calendar + CSV import,
// create-from-event, cover upload and scheduled publishing.
import {
  type ArticleCategory,
  type ArticleEditor,
  ContentCreate as ContentCreateSchema,
  type ContentDetail,
  type ContentItemEditor,
  type ContentPatch,
  type ContentQuery,
  type ContentRow,
  type ContentStatus,
  type ContentTab,
  type I18nText,
  type Media,
  type PhotoUploadForm,
  type ThoughtDay,
  type ThoughtsImportResult,
  type ThoughtsQuery,
  UPLOAD_LIMITS,
} from "@/contract";
import type { z } from "zod";
import { auditRec, type SystemActor } from "../../audit";
import { type Actor, assertCan } from "../../auth/rbac";
import { newId } from "../../db/columns";
import { sanitizeBody } from "../../domain/articles";
import { addDays, toIso, toIsoOrNull } from "../../domain/time";
import { ApiError } from "../../http/errors";
import { sniffImage } from "../../images";
import type { ArticleRec, ContentItemRec } from "../../repo/types";
import { sniffSheet } from "../../xlsx/sniff";
import { readSheet, SheetError } from "../../xlsx/sheet";
import { parseSheetDate } from "./uploads";
import { buildResults } from "../event-assembler";
import { legacyCategoryOf, legacyMediaOf, legacyStatusOf, type NativeArticle, type NativeDoc, nativeAll, nativeFromLegacy } from "../native-articles";
import { i18n, type OrgIndex } from "../org-index";
import { loadOrg, type PortalCtx } from "./shared";

type ContentCreate = z.output<typeof ContentCreateSchema>;

export interface ContentAdminService {
  list(actor: Actor, q: ContentQuery): Promise<{ data: ContentRow[]; meta: { page: number; pageSize: number; total: number; counts: Record<string, number> } }>;
  get(actor: Actor, id: string): Promise<ContentDetail>;
  create(actor: Actor, body: ContentCreate): Promise<ContentDetail>;
  patch(actor: Actor, id: string, body: ContentPatch): Promise<ContentDetail>;
  remove(actor: Actor, id: string): Promise<void>;
  fromEvent(actor: Actor, eventId: string): Promise<ArticleEditor>;
  uploadMedia(actor: Actor, file: { name: string; bytes: Uint8Array }, form: PhotoUploadForm): Promise<Media>;
  thoughts(actor: Actor, q: ThoughtsQuery): Promise<ThoughtDay[]>;
  importThoughts(actor: Actor, file: { name: string; bytes: Uint8Array }): Promise<ThoughtsImportResult>;
}

const LEGACY_PREFIX = "legacy-";

const tabOf = (category: ArticleCategory | null): ContentTab[] => {
  const tabs: ContentTab[] = ["all"];
  if (category === "news") tabs.push("news");
  else if (category === "activities") tabs.push("activities");
  else if (category === "centenary_national" || category === "centenary_state") tabs.push("centenary");
  else tabs.push("article");
  return tabs;
};

const fold = (s: string) => s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70) || "article";

const hasText = (v: string | null | undefined): v is string => !!v && v.trim().length > 0;
const itemStatus = (s: ContentItemRec["status"]): ContentStatus => (s === "archived" ? "hidden" : s);
const toItemStatus = (s: ContentStatus): ContentItemRec["status"] => (s === "hidden" ? "archived" : s === "scheduled" ? "draft" : s);

/** Cron `publish-scheduled`: scheduled articles whose time has come go live. */
export async function publishScheduled(ctx: PortalCtx, by: SystemActor): Promise<string[]> {
  const now = ctx.deps.now();
  const ids: string[] = [];
  for (const d of await ctx.repo.m6.docList<NativeArticle>("article", { k2: "scheduled" })) {
    if (!d.data.publishAt || new Date(d.data.publishAt).getTime() > now.getTime()) continue;
    const data: NativeArticle = { ...d.data, status: "published", publishedAt: d.data.publishAt };
    const res = await ctx.repo.m6.docUpdate("article", { id: d.id, k1: data.slug, k2: "published", data }, d.version, [
      auditRec(by, { action: "content.publish", entity: "article", entityId: d.id, data: { scheduled: true } }),
    ]);
    if (res.ok) ids.push(d.id);
  }
  if (ids.length) ctx.deps.revalidate(["articles", "home", "events"]);
  return ids;
}

export function createContentAdminService(ctx: PortalCtx): ContentAdminService {
  const { repo, deps } = ctx;
  const now = () => deps.now();
  const media = (rel: string) => `${deps.mediaBase.replace(/\/$/, "")}/${rel}`;

  // ---- mapping ------------------------------------------------------------------

  const districtRef = (org: OrgIndex, id: string | null) => (id && org.get(id)?.kind === "district" ? org.ref(id) : null);

  const legacyStatus = legacyStatusOf;
  const legacyCategory = legacyCategoryOf;

  function nativeRow(d: NativeDoc, org: OrgIndex): ContentRow {
    const a = d.data;
    return {
      id: d.id,
      type: "article",
      category: a.category,
      title: a.title,
      district: districtRef(org, a.districtId),
      languages: { en: hasText(a.title.en) && hasText(a.bodyHtml.en), hi: hasText(a.title.hi) && hasText(a.bodyHtml.hi) },
      status: a.status,
      publishAt: a.publishAt ?? a.publishedAt,
      date: null,
      updatedAt: toIso(d.updatedAt),
      legacy: a.legacyId !== null,
      eventId: a.eventId,
    };
  }

  function legacyRow(rec: ArticleRec, org: OrgIndex): ContentRow {
    return {
      id: `${LEGACY_PREFIX}${rec.id}`,
      type: "article",
      category: legacyCategory(rec),
      title: i18n(rec.title, rec.i18n?.titleHi ?? null),
      district: districtRef(org, rec.i18n?.districtId ?? null),
      languages: { en: true, hi: hasText(rec.i18n?.titleHi) && hasText(rec.i18n?.bodyHi) },
      status: legacyStatus(rec),
      publishAt: toIso(rec.createdAt),
      date: null,
      updatedAt: toIso(rec.updatedAt),
      legacy: true,
      eventId: rec.i18n?.eventId ?? null,
    };
  }

  function itemRow(c: ContentItemRec): ContentRow {
    const title = c.titleEn ? i18n(c.titleEn, c.titleHi) : i18n((c.bodyEn ?? c.key ?? "").slice(0, 120), c.bodyHi ? c.bodyHi.slice(0, 120) : null);
    return {
      id: c.id,
      type: c.kind,
      category: null,
      title,
      district: null,
      languages: { en: hasText(c.titleEn) || hasText(c.bodyEn), hi: hasText(c.titleHi) || hasText(c.bodyHi) },
      status: itemStatus(c.status),
      publishAt: toIsoOrNull(c.startsAt ?? null),
      date: c.date,
      updatedAt: toIso(c.updatedAt ?? new Date(0)),
      legacy: false,
      eventId: null,
    };
  }

  const nativeEditor = (d: NativeDoc, org: OrgIndex, event: ArticleEditor["event"]): ArticleEditor => ({
    kind: "article",
    id: d.id,
    slug: d.data.slug,
    category: d.data.category,
    title: d.data.title,
    summary: d.data.summary,
    bodyHtml: d.data.bodyHtml,
    cover: d.data.cover,
    gallery: d.data.gallery,
    district: districtRef(org, d.data.districtId),
    event,
    status: d.data.status,
    publishAt: d.data.publishAt,
    legacyId: d.data.legacyId,
    publicPath: `/news/${d.data.slug}`,
    updatedAt: toIso(d.updatedAt),
    version: d.version,
  });

  async function eventCard(org: OrgIndex, eventId: string | null): Promise<ArticleEditor["event"]> {
    if (!eventId) return null;
    const ev = await repo.eventById(eventId);
    if (!ev) return null;
    return {
      id: ev.id,
      title: i18n(ev.titleEn, ev.titleHi),
      sevaType: ev.sevaType,
      startsAt: toIso(ev.startsAt),
      venue: { name: ev.venueName, address: ev.venueAddress, geo: ev.venueLat !== null && ev.venueLng !== null ? { lat: ev.venueLat, lng: ev.venueLng } : null },
      samithi: org.ref(ev.samithiId),
      district: org.ref(ev.districtId),
    };
  }

  const legacyMedia = (path: string, alt: string): Media => legacyMediaOf(deps.mediaBase, path, alt);

  async function legacyEditor(rec: ArticleRec, org: OrgIndex): Promise<ArticleEditor> {
    return {
      kind: "article",
      id: `${LEGACY_PREFIX}${rec.id}`,
      slug: rec.slug,
      category: legacyCategory(rec) ?? "news",
      title: i18n(rec.title, rec.i18n?.titleHi ?? null),
      summary: i18n(rec.shortDescription, rec.i18n?.summaryHi ?? null),
      bodyHtml: { en: sanitizeBody(rec.content, deps.mediaBase), hi: rec.i18n?.bodyHi ? sanitizeBody(rec.i18n.bodyHi, deps.mediaBase) : null },
      cover: rec.featuredImage ? legacyMedia(rec.featuredImage, rec.title) : null,
      gallery: [...rec.gallery].sort((a, b) => a.order - b.order).map((g) => legacyMedia(g.image, g.caption ?? rec.title)),
      district: districtRef(org, rec.i18n?.districtId ?? null),
      event: await eventCard(org, rec.i18n?.eventId ?? null),
      status: legacyStatus(rec),
      publishAt: toIso(rec.createdAt),
      legacyId: rec.id,
      publicPath: `/news/${rec.slug}`,
      updatedAt: toIso(rec.updatedAt),
      version: 0,
    };
  }

  const itemEditor = (c: ContentItemRec): ContentItemEditor => ({
    kind: "item",
    id: c.id,
    type: c.kind,
    key: c.key,
    title: c.titleEn || c.titleHi ? i18n(c.titleEn ?? "", c.titleHi) : null,
    body: c.bodyEn || c.bodyHi ? i18n(c.bodyEn ?? "", c.bodyHi) : null,
    source: c.sourceEn || c.sourceHi ? i18n(c.sourceEn ?? "", c.sourceHi) : null,
    href: c.href,
    date: c.date,
    startsAt: toIsoOrNull(c.startsAt ?? null),
    endsAt: toIsoOrNull(c.endsAt ?? null),
    status: itemStatus(c.status),
    updatedAt: toIso(c.updatedAt ?? new Date(0)),
    version: c.version ?? 1,
  });

  // ---- lookups ------------------------------------------------------------------

  const nativeById = async (id: string) => (await repo.m6.docGet<NativeArticle>("article", id)) as NativeDoc | null;
  const itemById = async (id: string) => (await repo.m6.contentItemsAll()).find((c) => c.id === id) ?? null;

  async function slugTaken(slug: string, exceptId?: string): Promise<boolean> {
    if ((await nativeAll(repo)).some((d) => d.id !== exceptId && d.data.slug === slug)) return true;
    const legacy = await repo.m6.legacySlugs();
    if (!legacy.includes(slug)) return false;
    // A legacy slug is free for its own native copy.
    if (!exceptId) return true;
    const mine = await nativeById(exceptId);
    const copy = mine?.data.legacyId ? await repo.m6.legacyPost(mine.data.legacyId) : null;
    return copy?.slug !== slug;
  }

  async function uniqueSlug(base: string): Promise<string> {
    let slug = base;
    for (let n = 2; await slugTaken(slug); n++) slug = `${base.slice(0, 70)}-${n}`;
    return slug;
  }

  async function checkRefs(org: OrgIndex, districtId: string | null | undefined, eventId: string | null | undefined) {
    const fields: Record<string, string> = {};
    if (districtId && org.get(districtId)?.kind !== "district") fields.districtId = "Choose a district.";
    if (eventId && !(await repo.eventById(eventId))) fields.eventId = "That event does not exist.";
    if (Object.keys(fields).length) throw new ApiError("VALIDATION_FAILED", { fields });
  }

  const cleanI18n = (t: I18nText): I18nText => ({ en: t.en.trim(), hi: t.hi?.trim() ? t.hi.trim() : null });
  const cleanBody = (t: I18nText): I18nText => ({ en: sanitizeBody(t.en, deps.mediaBase), hi: t.hi?.trim() ? sanitizeBody(t.hi, deps.mediaBase) || null : null });

  function timing(status: ContentStatus, publishAt: string | null | undefined, cur: NativeArticle): Pick<NativeArticle, "status" | "publishAt" | "publishedAt"> {
    const t = now().getTime();
    if (status === "scheduled") {
      if (!publishAt) throw new ApiError("VALIDATION_FAILED", { fields: { publishAt: "Choose when to publish." } });
      if (new Date(publishAt).getTime() <= t) throw new ApiError("VALIDATION_FAILED", { fields: { publishAt: "Choose a time in the future." } });
      return { status, publishAt, publishedAt: cur.publishedAt };
    }
    if (status === "published") {
      if (publishAt && new Date(publishAt).getTime() > t) throw new ApiError("VALIDATION_FAILED", { fields: { publishAt: "Use Schedule for a future time." } });
      const at = publishAt ?? cur.publishedAt ?? toIso(now());
      return { status, publishAt: null, publishedAt: at };
    }
    return { status, publishAt: null, publishedAt: cur.publishedAt };
  }

  function assertPublishable(a: NativeArticle, status: ContentStatus) {
    if (status !== "published" && status !== "scheduled") return;
    const fields: Record<string, string> = {};
    if (!hasText(a.title.en)) fields.title = "Add an English title.";
    if (!hasText(a.bodyHtml.en)) fields.bodyHtml = "Add the English text.";
    if (Object.keys(fields).length) throw new ApiError("VALIDATION_FAILED", { fields });
  }

  function auditData(before: Record<string, unknown>, after: Record<string, unknown>) {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(after)) if (JSON.stringify(before[k]) !== JSON.stringify(after[k])) out[k] = { from: before[k], to: after[k] };
    return out;
  }

  const revalidate = () => deps.revalidate(["articles", "home", "events"]);

  /** Copies a legacy post into the native table (copy-on-write). */
  async function copyLegacy(rec: ArticleRec): Promise<NativeDoc> {
    const existing = (await nativeAll(repo)).find((d) => d.data.legacyId === rec.id);
    if (existing) throw new ApiError("CONFLICT");
    const data = nativeFromLegacy(rec, deps.mediaBase);
    return { id: newId(), k1: data.slug, k2: data.status, version: 1, data, createdAt: rec.createdAt, updatedAt: now() };
  }

  async function insertNative(actor: Actor, id: string, data: NativeArticle, action: string, extra: Record<string, unknown> = {}): Promise<NativeDoc> {
    const res = await repo.m6.docInsert("article", { id, k1: data.slug, k2: data.status, data }, [
      auditRec(actor, { action, entity: "article", entityId: id, data: { slug: data.slug, status: data.status, ...extra } }),
    ]);
    if (!res.ok) throw new ApiError("CONFLICT");
    return (await nativeById(id)) as NativeDoc;
  }

  // ---- public service -----------------------------------------------------------

  return {
    async list(actor, q) {
      assertCan(actor, "content.edit");
      const org = await loadOrg(repo);
      const [natives, legacy, items] = await Promise.all([nativeAll(repo), repo.m6.legacyPosts(), repo.m6.contentItemsAll()]);
      const shadow = new Set(natives.map((d) => d.data.legacyId).filter((x): x is number => x !== null));
      const rows: { row: ContentRow; at: number }[] = [
        ...natives.map((d) => ({ row: nativeRow(d, org), at: new Date(d.data.publishAt ?? d.data.publishedAt ?? d.updatedAt).getTime() })),
        ...legacy.filter((r) => !shadow.has(r.id)).map((r) => ({ row: legacyRow(r, org), at: r.createdAt.getTime() })),
        ...items.map((c) => ({ row: itemRow(c), at: c.date ? new Date(`${c.date}T00:00:00+05:30`).getTime() : (c.updatedAt ?? new Date(0)).getTime() })),
      ];
      const needle = q.q ? fold(q.q) : null;
      const base = rows.filter(({ row }) => {
        if (q.status && row.status !== q.status) return false;
        if (q.lang === "hi_missing" && row.languages.hi) return false;
        if (q.district && row.district?.id !== q.district) return false;
        if (needle && ![row.title.en, row.title.hi].some((t) => t && fold(t).includes(needle))) return false;
        return true;
      });
      const tabsFor = (row: ContentRow): ContentTab[] => (row.type === "article" ? tabOf(row.category) : ["all", row.type as ContentTab]);
      const counts: Record<string, number> = { all: 0, article: 0, news: 0, activities: 0, centenary: 0, home_section: 0, thought_for_day: 0, announcement: 0 };
      for (const { row } of base) for (const t of tabsFor(row)) counts[t]++;
      const tab = q.tab ?? "all";
      const shown = base.filter(({ row }) => tabsFor(row).includes(tab)).sort((a, b) => b.at - a.at);
      const data = shown.slice((q.page - 1) * q.pageSize, q.page * q.pageSize).map((x) => x.row);
      return { data, meta: { page: q.page, pageSize: q.pageSize, total: shown.length, counts } };
    },

    async get(actor, id) {
      assertCan(actor, "content.edit");
      const org = await loadOrg(repo);
      if (id.startsWith(LEGACY_PREFIX)) {
        const n = Number(id.slice(LEGACY_PREFIX.length));
        const rec = Number.isInteger(n) ? await repo.m6.legacyPost(n) : null;
        if (!rec) throw new ApiError("NOT_FOUND");
        const copy = (await nativeAll(repo)).find((d) => d.data.legacyId === rec.id);
        if (copy) return nativeEditor(copy, org, await eventCard(org, copy.data.eventId));
        return legacyEditor(rec, org);
      }
      const d = await nativeById(id);
      if (d) return nativeEditor(d, org, await eventCard(org, d.data.eventId));
      const item = await itemById(id);
      if (!item) throw new ApiError("NOT_FOUND");
      return itemEditor(item);
    },

    async create(actor, body) {
      assertCan(actor, "content.edit");
      const org = await loadOrg(repo);
      if (body.kind === "article") {
        await checkRefs(org, body.districtId, body.eventId);
        const slug = body.slug ? body.slug : await uniqueSlug(slugify(body.title.en));
        if (body.slug && (await slugTaken(slug))) throw new ApiError("VALIDATION_FAILED", { fields: { slug: "This address is already used." } });
        const data: NativeArticle = {
          slug,
          category: body.category,
          title: cleanI18n(body.title),
          summary: cleanI18n(body.summary ?? { en: "", hi: null }),
          bodyHtml: cleanBody(body.bodyHtml ?? { en: "", hi: null }),
          cover: body.cover,
          gallery: body.gallery,
          districtId: body.districtId ?? (body.eventId ? ((await repo.eventById(body.eventId))?.districtId ?? null) : null),
          eventId: body.eventId,
          status: "draft",
          publishAt: null,
          publishedAt: null,
          legacyId: null,
          createdBy: actor.userId,
        };
        const d = await insertNative(actor, newId(), data, "content.create");
        return nativeEditor(d, org, await eventCard(org, d.data.eventId));
      }
      const fields = itemProblems(body.type, body);
      if (Object.keys(fields).length) throw new ApiError("VALIDATION_FAILED", { fields });
      if (body.type === "thought_for_day" && body.date && (await repo.m6.contentItemsAll("thought_for_day")).some((c) => c.date === body.date)) {
        throw new ApiError("VALIDATION_FAILED", { fields: { date: "This day already has a thought." } });
      }
      const rec: ContentItemRec = {
        id: newId(),
        kind: body.type,
        key: body.key?.trim() || null,
        titleEn: body.title?.en.trim() || null,
        titleHi: body.title?.hi?.trim() || null,
        bodyEn: body.body?.en.trim() || null,
        bodyHi: body.body?.hi?.trim() || null,
        sourceEn: body.source?.en.trim() || null,
        sourceHi: body.source?.hi?.trim() || null,
        href: body.href?.trim() || null,
        date: body.date ?? null,
        status: "draft",
        sortOrder: 0,
        startsAt: body.startsAt ? new Date(body.startsAt) : null,
        endsAt: body.endsAt ? new Date(body.endsAt) : null,
      };
      await repo.m6.contentItemInsert(rec, [auditRec(actor, { action: "content.create", entity: "content_item", entityId: rec.id, data: { type: rec.kind, date: rec.date } })]);
      return itemEditor((await itemById(rec.id)) as ContentItemRec);
    },

    async patch(actor, id, body) {
      assertCan(actor, "content.edit");
      const org = await loadOrg(repo);
      let cur: NativeDoc | null = null;
      let legacyCopy: NativeDoc | null = null;
      if (id.startsWith(LEGACY_PREFIX)) {
        const n = Number(id.slice(LEGACY_PREFIX.length));
        const rec = Number.isInteger(n) ? await repo.m6.legacyPost(n) : null;
        if (!rec) throw new ApiError("NOT_FOUND");
        if (body.version !== 0) throw new ApiError("CONFLICT");
        legacyCopy = await copyLegacy(rec);
        cur = legacyCopy;
      } else {
        cur = await nativeById(id);
      }
      if (!cur) {
        const item = await itemById(id);
        if (!item) throw new ApiError("NOT_FOUND");
        return patchItem(actor, item, body);
      }
      if (!legacyCopy && cur.version !== body.version) throw new ApiError("CONFLICT");

      await checkRefs(org, body.districtId, body.eventId);
      const before = cur.data;
      const a: NativeArticle = { ...before };
      if (body.slug !== undefined && body.slug !== a.slug) {
        if (await slugTaken(body.slug, legacyCopy ? undefined : cur.id)) {
          // The copy's own legacy slug is the only legacy slug it may keep.
          if (!(legacyCopy && body.slug === before.slug)) throw new ApiError("VALIDATION_FAILED", { fields: { slug: "This address is already used." } });
        }
        a.slug = body.slug;
      }
      if (body.category) a.category = body.category;
      if (body.title) a.title = cleanI18n(body.title);
      if (body.summary) a.summary = cleanI18n(body.summary);
      if (body.bodyHtml) a.bodyHtml = cleanBody(body.bodyHtml);
      if (body.cover !== undefined) a.cover = body.cover;
      if (body.gallery) a.gallery = body.gallery;
      if (body.districtId !== undefined) a.districtId = body.districtId;
      if (body.eventId !== undefined) a.eventId = body.eventId;
      const status = body.status ?? a.status;
      const publishAt = body.publishAt !== undefined ? body.publishAt : status === "scheduled" ? a.publishAt : null;
      if (body.status !== undefined || body.publishAt !== undefined) {
        assertPublishable(a, status);
        Object.assign(a, timing(status, publishAt, a));
      }
      const changes = auditData(before as unknown as Record<string, unknown>, { ...a, bodyHtml: a.bodyHtml.en.length + (a.bodyHtml.hi?.length ?? 0) } as never);
      delete (changes as Record<string, unknown>).bodyHtml;
      if (JSON.stringify(before.bodyHtml) !== JSON.stringify(a.bodyHtml)) (changes as Record<string, unknown>).bodyHtml = "edited";
      const statusChanged = before.status !== a.status;
      const action = statusChanged && (a.status === "published" || a.status === "scheduled" || a.status === "hidden") ? `content.${a.status === "hidden" ? "hide" : a.status === "scheduled" ? "schedule" : "publish"}` : "content.update";
      const audit = [auditRec(actor, { action, entity: "article", entityId: cur.id, data: { slug: a.slug, legacyId: a.legacyId, changes } })];
      if (legacyCopy) {
        const r = await repo.m6.docInsert("article", { id: cur.id, k1: a.slug, k2: a.status, data: a }, audit);
        if (!r.ok) throw new ApiError("CONFLICT");
      } else {
        const r = await repo.m6.docUpdate("article", { id: cur.id, k1: a.slug, k2: a.status, data: a }, body.version, audit);
        if (!r.ok) throw new ApiError("CONFLICT");
      }
      revalidate();
      const d = (await nativeById(cur.id)) as NativeDoc;
      return nativeEditor(d, org, await eventCard(org, d.data.eventId));
    },

    async remove(actor, id) {
      assertCan(actor, "content.edit");
      if (id.startsWith(LEGACY_PREFIX)) throw new ApiError("CONFLICT");
      const d = await nativeById(id);
      if (d) {
        if (d.data.status !== "draft" || d.data.legacyId !== null) throw new ApiError("CONFLICT");
        await repo.m6.docDelete("article", id, [auditRec(actor, { action: "content.delete", entity: "article", entityId: id, data: { slug: d.data.slug } })]);
        return;
      }
      const item = await itemById(id);
      if (!item) throw new ApiError("NOT_FOUND");
      if (item.status !== "draft") throw new ApiError("CONFLICT");
      await repo.m6.contentItemDelete(id, [auditRec(actor, { action: "content.delete", entity: "content_item", entityId: id, data: { type: item.kind } })]);
    },

    async fromEvent(actor, eventId) {
      assertCan(actor, "content.edit");
      const org = await loadOrg(repo);
      const ev = await repo.eventById(eventId);
      if (!ev) throw new ApiError("NOT_FOUND");
      if (ev.status !== "approved") throw new ApiError("VALIDATION_FAILED", { fields: { eventId: "Only approved events can become an article." } });
      const [facts, types] = await Promise.all([repo.approvedFacts({ eventIds: [ev.id] }), repo.sevaTypes()]);
      const results = buildResults(ev, facts.filter((f) => f.eventId === ev.id));
      const seva = types.find((t) => t.code === ev.sevaType);
      const tile = results.tiles.find((t) => typeof t.figure.value === "number" && t.figure.value > 0);
      const headline = (l: "en" | "hi") => {
        if (!tile || typeof tile.figure.value !== "number") return null;
        const label = (l === "hi" ? tile.label.hi : null) ?? tile.label.en;
        return `${tile.figure.value} ${label.toLowerCase()}`;
      };
      const where = org.ref(ev.samithiId).name;
      const mk = (l: "en" | "hi") => {
        const sev = l === "hi" ? (seva?.labelHi ?? seva?.labelEn) : seva?.labelEn;
        const place = (l === "hi" ? where.hi : null) ?? where.en;
        const h = headline(l);
        const at = l === "hi" ? "में" : "at";
        const base = l === "hi" ? `${place} ${at} ${sev ?? ev.titleEn}` : `${sev ?? ev.titleEn} ${at} ${place}`;
        return h ? `${base}: ${h}` : base;
      };
      const summary = (l: "en" | "hi") => {
        const h = headline(l);
        const day = new Intl.DateTimeFormat(l === "hi" ? "hi-IN" : "en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" }).format(ev.startsAt);
        if (l === "hi") return `${where.hi ?? where.en} के सेवादलों ने ${day} को ${ev.venueName} में सेवा की।${h ? ` ${h}।` : ""}`;
        return `Sevadals of Samithi ${where.en} held ${(seva?.labelEn ?? ev.titleEn).toLowerCase()} at ${ev.venueName} on ${day}.${h ? ` ${h}.` : ""}`;
      };
      const titleEn = mk("en");
      const slug = await uniqueSlug(slugify(titleEn));
      const card = `<div data-event-results="${ev.id}"></div>`;
      const data: NativeArticle = {
        slug,
        category: "news",
        title: { en: titleEn, hi: org.ref(ev.samithiId).name.hi && seva?.labelHi ? mk("hi") : null },
        summary: { en: summary("en"), hi: org.ref(ev.samithiId).name.hi && seva?.labelHi ? summary("hi") : null },
        bodyHtml: { en: `<p>${escapeHtml(summary("en"))}</p>${card}`, hi: null },
        cover: ev.resultsPhotos[0] ? { url: (ev.resultsPhotos[0] as { url?: string }).url ?? "", width: null, height: null, alt: { en: titleEn, hi: null } } : null,
        gallery: [],
        districtId: ev.districtId,
        eventId: ev.id,
        status: "draft",
        publishAt: null,
        publishedAt: null,
        legacyId: null,
        createdBy: actor.userId,
      };
      if (data.cover && !data.cover.url) data.cover = null;
      const d = await insertNative(actor, newId(), data, "content.create", { fromEvent: ev.id });
      return nativeEditor(d, org, await eventCard(org, ev.id));
    },

    async uploadMedia(actor, file, form) {
      assertCan(actor, "content.edit");
      if (file.bytes.byteLength > UPLOAD_LIMITS.photoBytes) throw new ApiError("VALIDATION_FAILED", { fields: { file: "The photo is larger than 8 MB." } });
      const info = sniffImage(file.bytes);
      if (!info) throw new ApiError("VALIDATION_FAILED", { fields: { file: "Use a JPG, PNG or WebP photo." } });
      const rel = `content/${newId().toLowerCase()}.${info.ext}`;
      await deps.publicMedia.put(rel, file.bytes);
      await repo.portal.insertAudit(auditRec(actor, { action: "content.media", entity: "article", entityId: null, data: { bytes: file.bytes.byteLength } }));
      return { url: media(rel), width: info.width, height: info.height, alt: { en: form.alt, hi: null } };
    },

    async thoughts(actor, q) {
      assertCan(actor, "content.edit");
      if (q.to < q.from || daysBetween(q.from, q.to) > 61) throw new ApiError("VALIDATION_FAILED", { fields: { to: "Choose at most 62 days." } });
      const all = await repo.m6.contentItemsAll("thought_for_day");
      const live = all.filter((c) => c.status === "published" && c.bodyEn && c.date).sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
      const out: ThoughtDay[] = [];
      for (let d = q.from; d <= q.to; d = addDays(d, 1)) {
        const own = all.filter((c) => c.date === d).sort((a, b) => (a.status === "archived" ? 1 : 0) - (b.status === "archived" ? 1 : 0))[0] ?? null;
        const shownRec = live.find((c) => (c.date ?? "") <= d);
        out.push({
          date: d,
          item: own ? (itemEditor(own) as ContentItemEditor) : null,
          shown: shownRec ? { text: i18n(shownRec.bodyEn ?? "", shownRec.bodyHi), source: shownRec.sourceEn ? i18n(shownRec.sourceEn, shownRec.sourceHi) : null, repeated: shownRec.date !== d } : null,
        });
      }
      return out;
    },

    async importThoughts(actor, file) {
      assertCan(actor, "content.edit");
      if (sniffSheet(file.bytes, file.name) !== ".csv") throw new ApiError("VALIDATION_FAILED", { fields: { file: "Upload a .csv file." } });
      let sheet;
      try {
        sheet = await readSheet(file.bytes, ".csv", 800);
      } catch (err) {
        if (err instanceof SheetError) throw new ApiError("VALIDATION_FAILED", { fields: { file: err.message === "too_many_rows" ? "At most 800 rows." : "This file could not be read." } });
        throw err;
      }
      for (const h of ["date", "text_en"]) if (!sheet.headers.includes(h)) throw new ApiError("VALIDATION_FAILED", { fields: { file: `Missing column ${h}.` } });
      const existing = new Map((await repo.m6.contentItemsAll("thought_for_day")).filter((c) => c.date).map((c) => [c.date as string, c]));
      const out: ThoughtsImportResult = { created: 0, updated: 0, errors: [] };
      const txt = (cells: Map<string, { text: string }>, k: string) => cells.get(k)?.text.trim() ?? "";
      for (const r of sheet.rows) {
        const dateCell = r.cells.get("date");
        const date = dateCell ? parseSheetDate(dateCell) : null;
        const en = txt(r.cells, "text_en");
        if (!date) {
          out.errors.push({ row: r.row, message: { en: "The date must look like 2026-10-31.", hi: "तारीख 2026-10-31 जैसी होनी चाहिए।" } });
          continue;
        }
        if (!en) {
          out.errors.push({ row: r.row, message: { en: "The English text is empty.", hi: "अंग्रेज़ी पाठ खाली है।" } });
          continue;
        }
        if (en.length > 4000) {
          out.errors.push({ row: r.row, message: { en: "The text is too long.", hi: "पाठ बहुत लंबा है।" } });
          continue;
        }
        const fields = {
          bodyEn: en,
          bodyHi: txt(r.cells, "text_hi") || null,
          sourceEn: txt(r.cells, "source_en") || null,
          sourceHi: txt(r.cells, "source_hi") || null,
          status: "published" as const,
        };
        const cur = existing.get(date);
        if (cur) {
          const res = await repo.m6.contentItemUpdate(cur.id, fields, cur.version ?? 1, [auditRec(actor, { action: "content.thought.import", entity: "content_item", entityId: cur.id, data: { date } })]);
          if (res === "ok") {
            out.updated++;
            existing.set(date, { ...cur, ...fields, version: (cur.version ?? 1) + 1 });
          } else out.errors.push({ row: r.row, message: { en: "Someone else changed this day. Try again.", hi: "किसी और ने यह दिन बदल दिया है। फिर कोशिश करें।" } });
        } else {
          const rec: ContentItemRec = { id: newId(), kind: "thought_for_day", key: null, titleEn: null, titleHi: null, href: null, date, sortOrder: 0, ...fields, startsAt: null, endsAt: null, version: 1 };
          await repo.m6.contentItemInsert(rec, [auditRec(actor, { action: "content.thought.import", entity: "content_item", entityId: rec.id, data: { date } })]);
          existing.set(date, rec);
          out.created++;
        }
      }
      if (out.created + out.updated) deps.revalidate(["home"]);
      return out;
    },
  };

  // ---- items --------------------------------------------------------------------

  function itemProblems(type: ContentItemRec["kind"], v: { key?: string | null; title?: I18nText | null; body?: I18nText | null; date?: string | null; href?: string | null }): Record<string, string> {
    const f: Record<string, string> = {};
    if (type === "thought_for_day") {
      if (!v.date) f.date = "Choose the day.";
      if (!hasText(v.body?.en)) f.body = "Add the thought in English.";
    } else if (type === "announcement") {
      if (!hasText(v.title?.en)) f.title = "Add a title in English.";
    } else if (!hasText(v.key)) f.key = "Choose the home section.";
    if (v.href && !/^(\/|https:\/\/)/.test(v.href)) f.href = "Use a path starting with / or an https:// link.";
    return f;
  }

  async function patchItem(actor: Actor, cur: ContentItemRec, body: ContentPatch): Promise<ContentDetail> {
    if ((cur.version ?? 1) !== body.version) throw new ApiError("CONFLICT");
    if (body.status === "scheduled") throw new ApiError("VALIDATION_FAILED", { fields: { status: "Items go live when published." } });
    const patch: Partial<Omit<ContentItemRec, "id" | "kind">> = {};
    if (body.title) {
      patch.titleEn = body.title.en.trim() || null;
      patch.titleHi = body.title.hi?.trim() || null;
    }
    if (body.body !== undefined) {
      patch.bodyEn = body.body?.en.trim() || null;
      patch.bodyHi = body.body?.hi?.trim() || null;
    }
    if (body.source !== undefined) {
      patch.sourceEn = body.source?.en.trim() || null;
      patch.sourceHi = body.source?.hi?.trim() || null;
    }
    if (body.href !== undefined) patch.href = body.href?.trim() || null;
    if (body.date !== undefined) patch.date = body.date;
    if (body.startsAt !== undefined) patch.startsAt = body.startsAt ? new Date(body.startsAt) : null;
    if (body.endsAt !== undefined) patch.endsAt = body.endsAt ? new Date(body.endsAt) : null;
    if (body.status) patch.status = toItemStatus(body.status);
    const merged = { ...cur, ...patch };
    const fields = itemProblems(cur.kind, {
      key: merged.key,
      title: merged.titleEn ? i18n(merged.titleEn, merged.titleHi) : null,
      body: merged.bodyEn ? i18n(merged.bodyEn, merged.bodyHi) : null,
      date: merged.date,
      href: merged.href,
    });
    if (patch.status === "published" || patch.date !== undefined || patch.bodyEn !== undefined || patch.titleEn !== undefined || patch.href !== undefined) {
      if (Object.keys(fields).length) throw new ApiError("VALIDATION_FAILED", { fields });
    }
    if (cur.kind === "thought_for_day" && patch.date && patch.date !== cur.date) {
      if ((await repo.m6.contentItemsAll("thought_for_day")).some((c) => c.id !== cur.id && c.date === patch.date)) throw new ApiError("VALIDATION_FAILED", { fields: { date: "This day already has a thought." } });
    }
    const action = patch.status && patch.status !== cur.status ? (patch.status === "published" ? "content.publish" : patch.status === "archived" ? "content.hide" : "content.update") : "content.update";
    const res = await repo.m6.contentItemUpdate(cur.id, patch, body.version, [auditRec(actor, { action, entity: "content_item", entityId: cur.id, data: { type: cur.kind, status: patch.status ?? cur.status } })]);
    if (res === "conflict") throw new ApiError("CONFLICT");
    deps.revalidate(["home"]);
    return itemEditor((await itemById(cur.id)) as ContentItemRec);
  }
}

const escapeHtml = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string);

function daysBetween(from: string, to: string) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

