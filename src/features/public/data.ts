// Cached server reads for the public pages. Every reader goes through the service
// layer (CONTRACT §1) and is tagged so portal mutations can `revalidateTag` it (§6).
import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type {
  ArticleCategoryFilter,
  CentreListItem,
  CentresQuery,
  DistrictSummary,
  EventsQuery,
  ImpactPeriod,
  JoinPayload,
  JoinQuery,
  ProgramCard,
  ProgramDetail,
  ProgramsQuery,
  SevaType,
  ValuePayload,
  ValueSlug,
  Wing,
} from "@/contract";
import { services } from "@/server/services";
import { fixtureDistricts, fixtureJoin, fixtureProgram, fixturePrograms, fixtureValue } from "./dev-fixtures"; // TEMP M5 until backend merge

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

// The calls below use the backend's M5 services once they exist on `services()`;
// until then the TEMP fixtures answer (CONTRACT v0.6 shapes).
type M5Services = {
  values?: { bySlug(slug: ValueSlug): Promise<ValuePayload | null> };
  programs?: { list(q: ProgramsQuery): Promise<ProgramCard[]>; byType(type: SevaType): Promise<ProgramDetail | null> };
  join?: { get(q: JoinQuery): Promise<JoinPayload> };
  districts: { list?: () => Promise<DistrictSummary[]> };
};
const m5 = (): M5Services => services() as unknown as M5Services;

export async function getValue(slug: ValueSlug) {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.events, TAGS.centres, TAGS.impact);
  const s = m5().values;
  return s ? s.bySlug(slug) : fixtureValue(slug);
}

export async function getPrograms(wing?: Wing) {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.events, TAGS.impact);
  const s = m5().programs;
  return s ? s.list({ wing }) : fixturePrograms(wing);
}

export async function getProgram(type: SevaType) {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.events, TAGS.impact, TAGS.articles);
  const s = m5().programs;
  return s ? s.byType(type) : fixtureProgram(type);
}

export async function getJoin(q: JoinQuery) {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.events);
  const s = m5().join;
  return s ? s.get(q) : fixtureJoin(q);
}

export async function getDistricts() {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.centres);
  const d = m5().districts;
  return d.list ? d.list() : fixtureDistricts();
}
