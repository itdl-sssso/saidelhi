import sanitizeHtml from "sanitize-html";
import {
  type Article,
  type ArticleCategory,
  type ArticleCategoryFilter,
  type ArticleRef,
  LEGACY_ARTICLE_CATEGORY,
  type LegacyArticleCategory,
  type Media,
  type UnitRef,
} from "@/contract";
import type { ArticleRec } from "../repo/types";

const LETTER_BY_CATEGORY = Object.fromEntries(
  Object.entries(LEGACY_ARTICLE_CATEGORY).map(([letter, cat]) => [cat, letter]),
) as Record<ArticleCategory, LegacyArticleCategory>;

/** Legacy one-letter category → contract enum. Unknown letters fall back to 'news'. */
export function mapLegacyCategory(letter: string): ArticleCategory {
  return LEGACY_ARTICLE_CATEGORY[letter.toUpperCase() as LegacyArticleCategory] ?? "news";
}

/** `?c=` filter → legacy letters (undefined = no filter). */
export function legacyLettersFor(filter: ArticleCategoryFilter): LegacyArticleCategory[] | undefined {
  if (filter === "all") return undefined;
  if (filter === "centenary") return [LETTER_BY_CATEGORY.centenary_national, LETTER_BY_CATEGORY.centenary_state];
  return [LETTER_BY_CATEGORY[filter]];
}

export const CENTENARY_LETTERS = legacyLettersFor("centenary") ?? [];

const SANITIZE: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "br", "hr", "h2", "h3", "h4", "h5", "h6", "strong", "b", "em", "i", "u", "s", "sub", "sup",
    "blockquote", "ul", "ol", "li", "a", "img", "figure", "figcaption", "table", "thead", "tbody",
    "tr", "th", "td", "span", "div",
  ],
  allowedAttributes: {
    a: ["href", "title", "target", "rel"],
    img: ["src", "alt", "width", "height", "loading"],
    td: ["colspan", "rowspan"],
    th: ["colspan", "rowspan"],
  },
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowedSchemesByTag: { img: ["http", "https", "data"] },
  allowProtocolRelative: false,
  // Legacy CKEditor h1s would compete with the page title.
  transformTags: {
    h1: "h2",
    a: (tagName, attribs) => ({
      tagName,
      attribs: /^https?:\/\//.test(attribs.href ?? "")
        ? { ...attribs, target: "_blank", rel: "noopener noreferrer" }
        : attribs,
    }),
    img: (tagName, attribs) => ({ tagName, attribs: { ...attribs, loading: "lazy" } }),
  },
  exclusiveFilter: (frame) => frame.tag === "p" && !frame.text.trim() && !frame.mediaChildren.length,
};

export function sanitizeBody(html: string | null): string {
  if (!html) return "";
  return sanitizeHtml(html, SANITIZE).trim();
}

export function readingMinutes(html: string): number {
  const words = sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} }).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

export function mediaUrl(mediaBase: string, path: string): string {
  if (/^https?:\/\//.test(path) || path.startsWith("/")) return path;
  return `${mediaBase.replace(/\/$/, "")}/${path}`;
}

export interface ArticleContext {
  mediaBase: string;
  districts: Map<string, UnitRef>;
}

function legacyMedia(ctx: ArticleContext, path: string, alt: string): Media {
  return { url: mediaUrl(ctx.mediaBase, path), width: null, height: null, alt: { en: alt, hi: null } };
}

export function toArticle(rec: ArticleRec, ctx: ArticleContext): Article {
  const i18n = rec.i18n;
  const bodyEn = sanitizeBody(rec.content);
  const bodyHi = i18n?.bodyHi ? sanitizeBody(i18n.bodyHi) : null;
  const district = i18n?.districtId ? ctx.districts.get(i18n.districtId) : undefined;
  return {
    slug: rec.slug,
    category: mapLegacyCategory(rec.category),
    title: { en: rec.title, hi: i18n?.titleHi ?? null },
    summary: { en: rec.shortDescription, hi: i18n?.summaryHi ?? null },
    bodyHtml: { en: bodyEn, hi: bodyHi },
    cover: rec.featuredImage ? legacyMedia(ctx, rec.featuredImage, rec.title) : null,
    gallery: [...rec.gallery]
      .sort((a, b) => a.order - b.order)
      .map((g) => legacyMedia(ctx, g.image, g.caption ?? rec.title)),
    publishedAt: rec.createdAt.toISOString(),
    district: district ? { slug: district.slug, name: district.name } : null,
    eventId: i18n?.eventId ?? null,
    readingMinutes: readingMinutes(bodyEn),
    legacyId: rec.id,
  };
}

export function toArticleRef(rec: ArticleRec): ArticleRef {
  return {
    slug: rec.slug,
    category: mapLegacyCategory(rec.category),
    title: { en: rec.title, hi: rec.i18n?.titleHi ?? null },
    publishedAt: rec.createdAt.toISOString(),
  };
}
