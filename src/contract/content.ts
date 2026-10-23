import { z } from "zod";
import { ArticleCategory, DiscourseBlockType, Wing } from "./enums";
import { EventPublic } from "./events";
import { I18nText, ISODate, ISODateTime, Id, Media } from "./primitives";

export const Article = z.object({
  slug: z.string(),
  category: ArticleCategory,
  title: I18nText,
  summary: I18nText,
  /** Sanitised HTML. */
  bodyHtml: I18nText,
  cover: Media.nullable(),
  gallery: z.array(Media),
  publishedAt: ISODateTime,
  district: z.object({ slug: z.string(), name: I18nText }).nullable(),
  eventId: Id.nullable(),
  readingMinutes: z.number().int().positive(),
  legacyId: z.number().int().nullable(),
});
export type Article = z.infer<typeof Article>;

export const ArticleRef = Article.pick({ slug: true, category: true, title: true, publishedAt: true });
export type ArticleRef = z.infer<typeof ArticleRef>;

/** GET /articles/:slug — Article + prev/next/related (+ linked event box, spec 08). */
export const ArticleDetail = Article.extend({
  prev: ArticleRef.nullable(),
  next: ArticleRef.nullable(),
  related: z.array(Article),
  event: EventPublic.nullable(),
});
export type ArticleDetail = z.infer<typeof ArticleDetail>;

export const Thought = z.object({
  date: ISODate,
  text: I18nText,
  source: I18nText.nullable(),
});
export type Thought = z.infer<typeof Thought>;

export const WingCard = z.object({
  wing: Wing,
  title: I18nText,
  summary: I18nText,
  href: z.string(),
});
export type WingCard = z.infer<typeof WingCard>;

export const Announcement = z.object({
  id: Id,
  title: I18nText,
  body: I18nText,
  href: z.string().nullable(),
});
export type Announcement = z.infer<typeof Announcement>;

export const DiscourseBlock = z.object({
  id: z.string(),
  type: DiscourseBlockType,
  en: z.string(),
  hi: z.string().nullable(),
});

export const Discourse = z.object({
  slug: z.string(),
  n: z.number().int(),
  title: I18nText,
  date: z.string(),
  place: z.string(),
  occasion: z.string(),
  source: z.object({ coll: z.string(), url: z.string().nullable(), pdf: z.string().nullable() }),
  themes: z.array(z.string()),
  why: I18nText,
  blocks: z.array(DiscourseBlock),
  quotes: z.array(z.object({ en: z.string(), hi: z.string().nullable() })),
});
export type Discourse = z.infer<typeof Discourse>;

/** v0.6: card shape for discourse lists (Value page "Related discourses", spec 02/15). */
export const DiscourseSummary = Discourse.pick({ slug: true, n: true, title: true, date: true, place: true, themes: true });
export type DiscourseSummary = z.infer<typeof DiscourseSummary>;
