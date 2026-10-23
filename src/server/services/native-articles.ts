// Native `article` documents (M6, spec 38): editor-written articles and copy-on-write
// copies of legacy posts. Public reads overlay these on the Django posts.
import { type Article, type ArticleCategory, type I18nText, LEGACY_ARTICLE_CATEGORY, type Media, type UnitRef } from "@/contract";
import { type ArticleContext, mapLegacyCategory, readingMinutes, sanitizeBody, toArticle } from "../domain/articles";
import { toIso } from "../domain/time";
import type { DocRec } from "../repo/m6-types";
import type { ArticleRec, DataRepo } from "../repo/types";

export type NativeStatus = "draft" | "scheduled" | "published" | "hidden";

export interface NativeArticle {
  slug: string;
  category: ArticleCategory;
  title: I18nText;
  summary: I18nText;
  bodyHtml: I18nText;
  cover: Media | null;
  gallery: Media[];
  districtId: string | null;
  eventId: string | null;
  status: NativeStatus;
  /** Scheduled / go-live instant (ISO). */
  publishAt: string | null;
  /** Date shown publicly (ISO): set when it goes live; legacy copies keep the post date. */
  publishedAt: string | null;
  legacyId: number | null;
  createdBy: string | null;
}

export type NativeDoc = DocRec<NativeArticle>;

const LETTER_BY_CATEGORY = Object.fromEntries(Object.entries(LEGACY_ARTICLE_CATEGORY).map(([l, c]) => [c, l])) as Record<ArticleCategory, string>;

export const isLive = (a: NativeArticle, now: Date) =>
  a.status === "published" || (a.status === "scheduled" && !!a.publishAt && new Date(a.publishAt).getTime() <= now.getTime());

export const shownAt = (d: NativeDoc): Date => new Date(d.data.publishedAt ?? d.data.publishAt ?? d.createdAt);

export async function nativeAll(repo: DataRepo): Promise<NativeDoc[]> {
  return (await repo.m6.docList<NativeArticle>("article")) as NativeDoc[];
}

export async function nativeLive(repo: DataRepo, now: Date): Promise<NativeDoc[]> {
  return (await nativeAll(repo)).filter((d) => isLive(d.data, now)).sort((a, b) => shownAt(b).getTime() - shownAt(a).getTime());
}

/** Pseudo legacy record so the shared mappers (reading time, district, event) apply. */
export function nativeAsRec(d: NativeDoc): ArticleRec {
  const a = d.data;
  return {
    id: a.legacyId ?? 0,
    slug: a.slug,
    category: LETTER_BY_CATEGORY[a.category] ?? "N",
    title: a.title.en,
    shortDescription: a.summary.en,
    content: a.bodyHtml.en,
    featuredImage: "",
    createdAt: shownAt(d),
    updatedAt: d.updatedAt,
    i18n: { legacyId: a.legacyId ?? 0, titleHi: a.title.hi, summaryHi: a.summary.hi, bodyHi: a.bodyHtml.hi, districtId: a.districtId, eventId: a.eventId, status: "published" },
    gallery: [],
  };
}

export function nativeToArticle(d: NativeDoc, ctx: ArticleContext): Article {
  const a = d.data;
  const base = toArticle(nativeAsRec(d), ctx);
  const district: UnitRef | undefined = a.districtId ? ctx.districts.get(a.districtId) : undefined;
  const bodyEn = sanitizeBody(a.bodyHtml.en, ctx.mediaBase);
  return {
    ...base,
    category: a.category,
    bodyHtml: { en: bodyEn, hi: a.bodyHtml.hi ? sanitizeBody(a.bodyHtml.hi, ctx.mediaBase) : null },
    cover: a.cover,
    gallery: a.gallery,
    district: district ? { slug: district.slug, name: district.name } : null,
    readingMinutes: readingMinutes(bodyEn || a.bodyHtml.hi || ""),
    legacyId: a.legacyId,
    publishedAt: shownAt(d).toISOString(),
  };
}

/** Event id -> slug of the newest live native article about it. */
export async function nativeSlugsForEvents(repo: DataRepo, eventIds: readonly string[], now: Date): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  for (const d of await nativeLive(repo, now)) if (d.data.eventId && eventIds.includes(d.data.eventId) && !out.has(d.data.eventId)) out.set(d.data.eventId, d.data.slug);
  return out;
}

// ---- legacy posts -> native copies ---------------------------------------------

const isPublicLetter = (c: string) => c in LEGACY_ARTICLE_CATEGORY;

/** Category of a legacy post; null for the never-public letter `O` and unknown ones. */
export const legacyCategoryOf = (rec: ArticleRec): ArticleCategory | null => (isPublicLetter(rec.category) ? mapLegacyCategory(rec.category) : null);

/** Effective status of a legacy post: letter `O` is hidden even without a side row. */
export function legacyStatusOf(rec: ArticleRec): NativeStatus {
  const s = rec.i18n?.status ?? "published";
  return s === "published" && !isPublicLetter(rec.category) ? "hidden" : s;
}

const fallbackI18n = (en: string, hi: string | null | undefined): I18nText => ({ en, hi: hi ?? null });

export function legacyMediaOf(mediaBase: string, path: string, alt: string): Media {
  const url = /^(https?:\/\/|\/)/.test(path) ? path : `${mediaBase.replace(/\/$/, "")}/${path}`;
  return { url, width: null, height: null, alt: { en: alt, hi: null } };
}

/** Native copy of a legacy post (same slug, date and visibility). */
export function nativeFromLegacy(rec: ArticleRec, mediaBase: string, over: Partial<NativeArticle> = {}): NativeArticle {
  const hi = rec.i18n?.bodyHi ?? null;
  return {
    slug: rec.slug,
    category: legacyCategoryOf(rec) ?? "news",
    title: fallbackI18n(rec.title, rec.i18n?.titleHi),
    summary: fallbackI18n(rec.shortDescription, rec.i18n?.summaryHi),
    bodyHtml: { en: sanitizeBody(rec.content ?? "", mediaBase), hi: hi?.trim() ? sanitizeBody(hi, mediaBase) || null : null },
    cover: rec.featuredImage ? legacyMediaOf(mediaBase, rec.featuredImage, rec.title) : null,
    gallery: [...rec.gallery].sort((a, b) => a.order - b.order).map((g) => legacyMediaOf(mediaBase, g.image, g.caption ?? rec.title)),
    districtId: rec.i18n?.districtId ?? null,
    eventId: rec.i18n?.eventId ?? null,
    status: legacyStatusOf(rec),
    publishAt: null,
    publishedAt: toIso(rec.createdAt),
    legacyId: rec.id,
    createdBy: null,
    ...over,
  };
}
