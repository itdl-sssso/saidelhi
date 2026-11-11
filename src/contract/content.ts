import { z } from "zod";
import { ArticleCategory, ContentTypeSlug, DiscourseBlockType, DiscourseTheme, Wing } from "./enums";
import { EventPublic } from "./events";
import { I18nText, ISODate, ISODateTime, Id, Media } from "./primitives";

/** v0.10.5: optional YouTube video (unlisted links work). `url` is the watch URL. */
export const YouTubeVideo = z.object({ provider: z.literal("youtube"), id: z.string(), url: z.string() });
/**
 * v0.11: video from the portal library, streamed by Cloudflare Stream. `id` = our library id (what
 * the editor stores as `cf:<id>`); `uid` = provider id. Only ready videos are ever exposed publicly.
 */
export const CloudflareVideo = z.object({
  provider: z.literal("cloudflare"),
  id: z.string(),
  uid: z.string(),
  /** Player URL without autoplay/poster/caption params. Empty for the mock provider (placeholder player). */
  iframeUrl: z.string(),
  posterUrl: z.string(),
  durationS: z.number().nullable(),
  /** Caption languages available (`hi` / `en`). */
  captions: z.array(z.enum(["hi", "en"])),
});
export type CloudflareVideo = z.infer<typeof CloudflareVideo>;
export const ArticleVideo = z.discriminatedUnion("provider", [YouTubeVideo, CloudflareVideo]);
export type ArticleVideo = z.infer<typeof ArticleVideo>;

/** Stored reference of a library video in the article's video slot (`cf:<video id>`). */
export const CF_VIDEO_PREFIX = "cf:";
export const cfVideoRef = (id: string) => `${CF_VIDEO_PREFIX}${id}`;
export const cfVideoIdOf = (ref: string | null | undefined): string | null => (ref?.startsWith(CF_VIDEO_PREFIX) ? ref.slice(CF_VIDEO_PREFIX.length) || null : null);

const YT_ID = /^[A-Za-z0-9_-]{11}$/;
const YT_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com", "youtube-nocookie.com", "www.youtube-nocookie.com", "youtu.be", "www.youtu.be"]);

/**
 * YouTube link or bare 11-char id -> id. Accepts watch?v=, youtu.be/, /shorts/, /embed/,
 * /live/, /v/ on youtube.com, youtube-nocookie.com and youtu.be. Empty/invalid -> null.
 */
export function parseYouTubeId(input: string | null | undefined): string | null {
  const s = (input ?? "").trim();
  if (!s) return null;
  if (YT_ID.test(s)) return s;
  let u: URL;
  try {
    u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
  } catch {
    return null;
  }
  const host = u.hostname.toLowerCase();
  if (!YT_HOSTS.has(host)) return null;
  const parts = u.pathname.split("/").filter(Boolean);
  const cand = host.endsWith("youtu.be") ? parts[0] : parts[0] === "watch" ? u.searchParams.get("v") : ["shorts", "embed", "live", "v"].includes(parts[0] ?? "") ? parts[1] : null;
  return cand && YT_ID.test(cand) ? cand : null;
}

export const youTubeWatchUrl = (id: string) => `https://www.youtube.com/watch?v=${id}`;
export const youTubeThumb = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
/** Poster/thumbnail of an article video (YouTube thumbnail or Stream poster). */
export const articleVideoThumb = (v: ArticleVideo): string => (v.provider === "youtube" ? youTubeThumb(v.id) : v.posterUrl);
/**
 * Stored reference -> DTO. A library reference (`cf:<id>`) comes back as an unresolved stub (empty uid/urls);
 * the articles service resolves it against the video library and drops it unless the video is ready.
 */
export const articleVideoOf = (ref: string | null | undefined): ArticleVideo | null => {
  if (!ref) return null;
  const cf = cfVideoIdOf(ref);
  if (cf) return { provider: "cloudflare", id: cf, uid: "", iframeUrl: "", posterUrl: "", durationS: null, captions: [] };
  return { provider: "youtube", id: ref, url: youTubeWatchUrl(ref) };
};

export const Article = z.object({
  slug: z.string(),
  category: ArticleCategory,
  /** v0.10: the article's admin-managed type (slug + display name). `category` is its nearest built-in. */
  type: z.object({ slug: ContentTypeSlug, label: I18nText }).nullable().optional(),
  title: I18nText,
  summary: I18nText,
  /** Sanitised HTML. */
  bodyHtml: I18nText,
  cover: Media.nullable(),
  video: ArticleVideo.nullable(),
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
  /** The picture that belongs to this thought (coordinator-uploaded); null/absent = the page uses its default. */
  image: z.object({ url: z.string(), alt: I18nText }).nullable().optional(),
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
  /** v0.8: theme keys (was free strings). */
  themes: z.array(DiscourseTheme),
  why: I18nText,
  blocks: z.array(DiscourseBlock),
  /** v0.8: `blockId` = paragraph the line comes from (null for legacy/imported candidates not yet matched). Public: 2–4. */
  quotes: z.array(z.object({ en: z.string(), hi: z.string().nullable(), blockId: z.string().nullable() })),
});
export type Discourse = z.infer<typeof Discourse>;

/** v0.6: card shape for discourse lists (Value page "Related discourses", spec 02/15). */
export const DiscourseSummary = Discourse.pick({ slug: true, n: true, title: true, date: true, place: true, themes: true });
export type DiscourseSummary = z.infer<typeof DiscourseSummary>;
