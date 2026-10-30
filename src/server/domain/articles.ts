import sanitizeHtml from "sanitize-html";
import {
  type Article,
  type ArticleCategoryFilter,
  type ArticleCategory,
  type BuiltinArticleCategory,
  type I18nText,
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
export function mapLegacyCategory(letter: string): BuiltinArticleCategory {
  return LEGACY_ARTICLE_CATEGORY[letter.toUpperCase() as LegacyArticleCategory] ?? "news";
}

/** `?c=` filter → legacy letters (undefined = no filter). */
export function legacyLettersFor(filter: ArticleCategoryFilter): LegacyArticleCategory[] | undefined {
  if (filter === "all") return undefined;
  if (filter === "centenary") return [LETTER_BY_CATEGORY.centenary_national, LETTER_BY_CATEGORY.centenary_state];
  // Types added by coordinators have no legacy posts.
  return LETTER_BY_CATEGORY[filter as ArticleCategory] ? [LETTER_BY_CATEGORY[filter as ArticleCategory]] : [];
}

/** Letters that may be shown publicly; any other legacy category (e.g. 'O') is never public. */
export const PUBLIC_ARTICLE_LETTERS = Object.keys(LEGACY_ARTICLE_CATEGORY) as LegacyArticleCategory[];

export const CENTENARY_LETTERS = legacyLettersFor("centenary") ?? [];

const LEGACY_MEDIA_URL = /^(?:https?:\/\/(?:www\.)?saidelhi\.org)?\/?(?:\.\.?\/)*media\//i;

/** Old absolute (`https://saidelhi.org/media/x.jpg`) and relative (`media/x.jpg`) uploads -> `<mediaBase>/x.jpg`. */
export function rewriteLegacyMedia(url: string | undefined, mediaBase: string): string | undefined {
  if (!url) return url;
  const u = url.trim();
  return LEGACY_MEDIA_URL.test(u) ? `${mediaBase.replace(/\/$/, "")}/${u.replace(LEGACY_MEDIA_URL, "")}` : url;
}

function sanitizeOptions(mediaBase: string): sanitizeHtml.IOptions {
  return {
    allowedTags: [
      "p", "br", "hr", "h2", "h3", "h4", "h5", "h6", "strong", "b", "em", "i", "u", "s", "sub", "sup",
      "blockquote", "ul", "ol", "li", "a", "img", "figure", "figcaption", "table", "thead", "tbody",
      "tr", "th", "td", "span", "div",
    ],
    // `style`, `class` and `width/height` styling from the old CKEditor never survive.
    allowedAttributes: {
      a: ["href", "title", "target", "rel"],
      img: ["src", "alt", "width", "height", "loading"],
      div: ["data-event-results"],
      td: ["colspan", "rowspan"],
      th: ["colspan", "rowspan"],
    },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowedSchemesByTag: { img: ["http", "https", "data"] },
    allowProtocolRelative: false,
    // Legacy CKEditor h1s would compete with the page title.
    transformTags: {
      h1: "h2",
      // Results card placeholder: only a plain event id survives.
      div: (tagName, attribs) => ({ tagName, attribs: /^[A-Za-z0-9_-]{1,64}$/.test(attribs["data-event-results"] ?? "") ? { "data-event-results": attribs["data-event-results"] as string } : ({} as Record<string, string>) }),
      a: (tagName, attribs) => {
        const href = rewriteLegacyMedia(attribs.href, mediaBase);
        return {
          tagName,
          attribs: /^https?:\/\//.test(href ?? "")
            ? { ...attribs, href: href as string, target: "_blank", rel: "noopener noreferrer" }
            : href === undefined
              ? attribs
              : { ...attribs, href },
        };
      },
      img: (tagName, attribs) => ({ tagName, attribs: { ...attribs, src: rewriteLegacyMedia(attribs.src, mediaBase) ?? "", loading: "lazy" } }),
    },
    // Empty paragraphs (`<p>&nbsp;</p>`, `<p><br></p>`) are CKEditor spacing, not content.
    exclusiveFilter: (frame) => frame.tag === "p" && !frame.text.replace(/\u00a0/g, " ").trim() && !frame.mediaChildren.length,
  };
}

const optionsCache = new Map<string, sanitizeHtml.IOptions>();

export function sanitizeBody(html: string | null, mediaBase = "/media"): string {
  if (!html) return "";
  let opts = optionsCache.get(mediaBase);
  if (!opts) optionsCache.set(mediaBase, (opts = sanitizeOptions(mediaBase)));
  return sanitizeHtml(html, opts).trim();
}

export function readingMinutes(html: string): number {
  const words = sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} }).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

export function mediaUrl(mediaBase: string, path: string): string {
  if (/^https?:\/\//.test(path) || path.startsWith("/")) return path;
  return `${mediaBase.replace(/\/$/, "")}/${path}`;
}

export function typeOf(ctx: ArticleContext, slug: string): Article["type"] {
  const label = ctx.categoryLabels?.get(slug);
  return label ? { slug, label } : null;
}

export interface ArticleContext {
  mediaBase: string;
  districts: Map<string, UnitRef>;
  /** Display names of article types (slug -> label); filled from the admin-managed list. */
  categoryLabels?: ReadonlyMap<string, I18nText>;
}

function legacyMedia(ctx: ArticleContext, path: string, alt: string): Media {
  return { url: mediaUrl(ctx.mediaBase, path), width: null, height: null, alt: { en: alt, hi: null } };
}

export function toArticle(rec: ArticleRec, ctx: ArticleContext): Article {
  const i18n = rec.i18n;
  const bodyEn = sanitizeBody(rec.content, ctx.mediaBase);
  const bodyHi = i18n?.bodyHi ? sanitizeBody(i18n.bodyHi, ctx.mediaBase) : null;
  const district = i18n?.districtId ? ctx.districts.get(i18n.districtId) : undefined;
  const sortedGallery = [...rec.gallery].sort((a, b) => a.order - b.order);
  return {
    slug: rec.slug,
    category: mapLegacyCategory(rec.category),
    type: typeOf(ctx, mapLegacyCategory(rec.category)),
    title: { en: rec.title, hi: i18n?.titleHi ?? null },
    summary: { en: rec.shortDescription, hi: i18n?.summaryHi ?? null },
    bodyHtml: { en: bodyEn, hi: bodyHi },
    // Legacy posts with no featured image fall back to their first gallery image (mapping only; legacy rows stay as they are).
    cover: rec.featuredImage ? legacyMedia(ctx, rec.featuredImage, rec.title) : (sortedGallery[0] ? legacyMedia(ctx, sortedGallery[0].image, sortedGallery[0].caption ?? rec.title) : null),
    gallery: sortedGallery.map((g) => legacyMedia(ctx, g.image, g.caption ?? rec.title)),
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
