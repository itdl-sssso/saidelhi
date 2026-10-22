import type {
  Article,
  ArticleDetail,
  ArticlesQuery,
  CentreDetail,
  CentreListItem,
  CentresQuery,
  DistrictPayload,
  EventPublic,
  EventsQuery,
  FeatureFlags,
  HomePayload,
  ImpactPayload,
  ImpactQuery,
  Paged,
  PrivacyRequestParsed,
} from "@/contract";

export interface HomeService {
  get(): Promise<HomePayload>;
}

export interface EventsService {
  /** Public statuses only; defaults to upcoming (from = today IST). */
  list(q: EventsQuery): Promise<Paged<EventPublic>>;
  /** null when missing or not public. */
  byId(id: string): Promise<EventPublic | null>;
}

export interface CentresService {
  list(q: CentresQuery): Promise<Paged<CentreListItem>>;
  bySlug(slug: string): Promise<CentreDetail | null>;
}

export interface DistrictsService {
  bySlug(slug: string): Promise<DistrictPayload | null>;
}

export interface ImpactService {
  /** null when the district filter names an unknown district. */
  get(q: ImpactQuery): Promise<ImpactPayload | null>;
}

export interface ArticlesService {
  list(q: ArticlesQuery): Promise<Paged<Article>>;
  bySlug(slug: string): Promise<ArticleDetail | null>;
}

export interface PrivacyRequestMeta {
  requestId: string;
  ipHash: string | null;
}

export interface PrivacyService {
  createRequest(input: PrivacyRequestParsed, meta: PrivacyRequestMeta): Promise<{ id: string }>;
}

export interface FlagsService {
  flags(): Promise<FeatureFlags>;
}

export interface Services {
  readonly dataSource: "mock" | "db";
  home: HomeService;
  events: EventsService;
  centres: CentresService;
  districts: DistrictsService;
  impact: ImpactService;
  articles: ArticlesService;
  privacy: PrivacyService;
  flags: FlagsService;
}

export interface ServiceDeps {
  now: () => Date;
  /** Public URL prefix for legacy media paths. */
  mediaBase: string;
}
