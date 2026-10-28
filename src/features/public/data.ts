// Cached server reads for the public pages. Every reader goes through the service
// layer (CONTRACT §1) and is tagged so portal mutations can `revalidateTag` it (§6).
import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type {
  ArticleCategoryFilter,
  CentreListItem,
  CentresQuery,
  EventsQuery,
  GalleryQuery,
  ImpactPeriod,
  JoinQuery,
  SevaType,
  ValueSlug,
  Wing,
} from "@/contract";
import { services } from "@/server/services";

export const TAGS = {
  home: "home",
  events: "events",
  impact: "impact",
  articles: "articles",
  centres: "centres",
  gallery: "gallery",
} as const;

export async function getHome() {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.home, TAGS.events, TAGS.impact, TAGS.articles);
  return services().home.get();
}

export type EventsFilter = Partial<Pick<EventsQuery, "from" | "to" | "district" | "sevaType" | "samithi" | "needsVolunteers">>;

export async function getEvents(filter: EventsFilter, page = 1, pageSize = 100) {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.events);
  return services().events.list({ ...filter, page, pageSize });
}

export async function getEvent(id: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.events, `event:${id}`);
  return services().events.byId(id);
}

export async function getCentre(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.centres, TAGS.events, TAGS.impact, `centre:${slug}`);
  return services().centres.bySlug(slug);
}

/** Every active centre (one page of up to 100), used for filter options and the home finder. */
export async function getCentres(): Promise<CentreListItem[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.centres);
  return (await services().centres.list({ page: 1, pageSize: 100 })).data;
}

export async function getImpact(period: ImpactPeriod, district?: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.impact, TAGS.events);
  return services().impact.get({ period, district });
}

// ── M5 public P1 readers ─────────────────────────────────────────────────────

export async function getArticles(c: ArticleCategoryFilter, page: number) {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.articles);
  return services().articles.list({ c, page, pageSize: 12 });
}

export async function getArticle(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.articles, TAGS.events, `article:${slug}`);
  return services().articles.bySlug(slug);
}

export async function getDistrict(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.impact, TAGS.events, TAGS.centres, `district:${slug}`);
  return services().districts.bySlug(slug);
}

export async function getCentresSearch(q: Pick<CentresQuery, "q" | "district" | "pincode">) {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.centres);
  return (await services().centres.list({ ...q, page: 1, pageSize: 100 })).data;
}

export async function getValue(slug: ValueSlug) {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.events, TAGS.centres, TAGS.impact);
  return services().values.bySlug(slug);
}

export async function getPrograms(wing?: Wing) {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.events, TAGS.impact);
  return services().programs.list({ wing });
}

export async function getProgram(type: SevaType) {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.events, TAGS.impact, TAGS.articles);
  return services().programs.byType(type);
}

export async function getJoin(q: JoinQuery) {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.events);
  return services().join.get(q);
}

export async function getDistricts() {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.centres);
  return services().districts.list();
}

export async function getGalleryAlbums(q: GalleryQuery) {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.gallery, TAGS.articles, TAGS.events, TAGS.centres);
  return services().gallery.albums(q);
}

export async function getGalleryAlbum(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.gallery, TAGS.articles, TAGS.events, TAGS.centres, `gallery:${slug}`);
  return services().gallery.album(slug);
}
