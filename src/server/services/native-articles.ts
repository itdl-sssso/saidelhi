// Native `article` documents (M6, spec 38): editor-written articles and copy-on-write
// copies of legacy posts. Public reads overlay these on the Django posts.
import { type Article, type ArticleCategory, type I18nText, LEGACY_ARTICLE_CATEGORY, type Media, type UnitRef } from "@/contract";
import { type ArticleContext, readingMinutes, sanitizeBody, toArticle } from "../domain/articles";
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
