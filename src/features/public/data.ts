// Cached server reads for the public pages. Every reader goes through the service
// layer (CONTRACT §1) and is tagged so portal mutations can `revalidateTag` it (§6).
import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { CentreListItem, EventsQuery, ImpactPeriod } from "@/contract";
import { services } from "@/server/services";

export const TAGS = {
  home: "home",
  events: "events",
  impact: "impact",
  articles: "articles",
  centres: "centres",
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
