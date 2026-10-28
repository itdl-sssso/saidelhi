// Storage-neutral records and the repository port. Services (src/server/services)
// hold all business rules (public visibility, approval gating, suppression) and
// run unchanged over either the mock repository (fixtures) or the db repository.
import type {
  ArticleStatus,
  ContentStatus,
} from "../db/schema/content";
import type {
  ContentKind,
  EventStatus,
  GatheringKind,
  I18nText,
  LegacyArticleCategory,
  Locale,
  Media,
  OrgUnitKind,
  PartnerKind,
  PrivacyRequestType,
  Role,
  SevaType,
  Source,
  TimelineChannel,
  Wing,
} from "@/contract";
import type { LinksRepo } from "./links-types";
import type { DiscourseRepo } from "./discourse-types";
import type { M6Repo } from "./m6-types";
import type { PrivacyRepo } from "./privacy-types";
import type { PortalRepo } from "./portal-types";
import type { WaRepo } from "./wa-types";

export interface OrgUnitRec {
  id: string;
  code: string;
  kind: OrgUnitKind;
  nameEn: string;
  nameHi: string | null;
  slug: string;
  parentId: string | null;
  introEn: string | null;
  introHi: string | null;
  sortOrder: number;
  active: boolean;
  mergedIntoId: string | null;
  version: number;
}

export interface SevaTypeRec {
  code: SevaType;
  labelEn: string;
  labelHi: string | null;
  icon: string;
  wing: Wing;
  sortOrder: number;
  active: boolean;
  /** Published form template for this seva type (M6). */
  templateId?: string | null;
  version?: number;
}

export interface PartnerRec {
  id: string;
  name: string;
  kind: PartnerKind;
  city: string;
  active: boolean;
  /** M6 admin fields (absent in fixtures = defaults). */
  nameHi?: string | null;
  contact?: string | null;
  showPublicly?: boolean;
  version?: number;
}

export interface GatheringRec {
  id: string;
  centreId: string;
  day: number;
  time: string;
  kind: GatheringKind;
  language: Locale | "mixed";
  sortOrder: number;
}

export interface CentreRec {
  id: string;
  slug: string;
  samithiId: string;
  nameEn: string;
  nameHi: string | null;
  addressEn: string;
  addressHi: string | null;
  pincode: string | null;
  lat: number | null;
  lng: number | null;
  contactPhone: string | null;
  photos: Media[];
  active: boolean;
  version?: number;
  updatedAt?: Date;
}

export interface EventRec {
  id: string;
  sevaType: SevaType;
  status: EventStatus;
  titleEn: string;
  titleHi: string | null;
  descriptionEn: string | null;
  descriptionHi: string | null;
  startsAt: Date;
  endsAt: Date | null;
  postponedTo: Date | null;
  venueName: string;
  venueAddress: string;
  venueLat: number | null;
  venueLng: number | null;
  samithiId: string;
  districtId: string;
  centreId: string | null;
  partnerId: string | null;
  volunteersNeeded: number | null;
  volunteersJoined: number;
  bring: I18nText[];
  resultsPhotos: Media[];
  recurring: boolean;
  source: Source;
  createdBy: string | null;
  reportDueAt: Date | null;
  approvedAt: Date | null;
  approvalRequestedAt: Date | null;
  escalatedAt: Date | null;
  escalatedFrom: EventStatus | null;
  selfApproved: boolean;
  version: number;
  updatedAt: Date;
}

export interface TimelineRec {
  id: string;
  eventId: string;
  status: EventStatus | "event_day";
  at: Date | null;
  byRole: Role | null;
  byLabel: string | null;
  channel: TimelineChannel | null;
  note: string | null;
}

export interface KpiFactRec {
  id: string;
  eventId: string;
  submissionId: string | null;
  kpiKey: string;
  /** '' = total. */
  dim: string;
  value: number | null;
  estimate: boolean;
  approvedAt: Date | null;
}

export interface EstimateRec {
  id: string;
  orgUnitId: string;
  sevaType: SevaType | null;
  kpiKey: string;
  /** 'YYYY-MM-01' */
  month: string;
  value: number;
  note: string | null;
  visible: boolean;
  /** 'year' estimates sit on Jan 1; default 'month'. */
  period?: "year" | "month";
  createdBy?: string | null;
  createdAt?: Date;
}

export interface ArticleI18nRec {
  legacyId: number;
  titleHi: string | null;
  summaryHi: string | null;
  bodyHi: string | null;
  districtId: string | null;
  eventId: string | null;
  status: ArticleStatus;
}

/** A legacy post joined with its optional i18n side row. */
export interface ArticleRec {
  id: number;
  slug: string;
  category: LegacyArticleCategory | string;
  title: string;
  shortDescription: string;
  content: string | null;
  featuredImage: string;
  createdAt: Date;
  updatedAt: Date;
  i18n: ArticleI18nRec | null;
  gallery: { image: string; caption: string | null; order: number }[];
}

/** Legacy home slider image (public site asset; path relative to MEDIA_ROOT). */
export interface SliderImageRec {
  id: number;
  image: string;
  caption1: string | null;
  caption2: string | null;
  order: number;
}

export interface ContentItemRec {
  id: string;
  kind: ContentKind;
  key: string | null;
  titleEn: string | null;
  titleHi: string | null;
  bodyEn: string | null;
  bodyHi: string | null;
  sourceEn: string | null;
  sourceHi: string | null;
  href: string | null;
  date: string | null;
  status: ContentStatus;
  sortOrder: number;
  /** Admin fields (not selected by the public read). */
  startsAt?: Date | null;
  endsAt?: Date | null;
  version?: number;
  updatedAt?: Date;
}

export interface PrivacyRequestRec {
  id: string;
  name: string;
  phone: string;
  type: PrivacyRequestType;
  details: string;
  locale: Locale;
  dueAt: Date;
  ipHash: string | null;
}

export interface AuditRec {
  actorId: string | null;
  actorRole: Role | "public" | "system" | null;
  action: string;
  entity: string;
  entityId: string | null;
  scopeId: string | null;
  requestId: string | null;
  ipHash: string | null;
  data: Record<string, unknown> | null;
}

export interface EventFilter {
  statuses: readonly EventStatus[];
  /** Inclusive lower bound on startsAt. */
  from?: Date;
  /** Exclusive upper bound on startsAt. */
  to?: Date;
  districtId?: string;
  samithiId?: string;
  sevaType?: SevaType;
  needsVolunteers?: boolean;
  /** true = only recurring rows, false = only one-off rows. */
  recurring?: boolean;
  order: "asc" | "desc";
  limit: number;
  offset: number;
}

export interface ArticleFilter {
  categories?: readonly string[];
  /** Legacy post ids shadowed by a native article copy. */
  excludeIds?: readonly number[];
  limit: number;
  offset: number;
}

export interface RedirectRec {
  fromPath: string;
  toPath: string;
  permanent: boolean;
  source: "rule" | "manual" | "migration";
  hits: number;
}

export interface DataRepo {
  readonly kind: "mock" | "db";
  /** Form templates, links, OTP, sessions, submissions (M2). */
  readonly links: LinksRepo;
  /** People, sessions, approvals, audit and admin writes (M3). */
  readonly portal: PortalRepo;
  /** WhatsApp bot, review inbox and opt-in (M4). */
  readonly wa: WaRepo;
  /** Portal P1 documents and settings writes (M6). */
  readonly m6: M6Repo;
  readonly privacy: PrivacyRepo;
  /** Discourses: public reads (B1) and workspace (B2) (M7). */
  readonly discourses: DiscourseRepo;

  orgUnits(): Promise<OrgUnitRec[]>;
  sevaTypes(): Promise<SevaTypeRec[]>;
  partners(ids: readonly string[]): Promise<PartnerRec[]>;
  /** Active partners of the given kinds, name order. */
  partnersByKind(kinds: readonly PartnerKind[]): Promise<PartnerRec[]>;
  settings(keys: readonly string[]): Promise<Map<string, unknown>>;

  centres(): Promise<CentreRec[]>;
  centreBySlug(slug: string): Promise<CentreRec | null>;
  gatherings(centreIds: readonly string[]): Promise<GatheringRec[]>;

  listEvents(filter: EventFilter): Promise<{ rows: EventRec[]; total: number }>;
  eventById(id: string): Promise<EventRec | null>;
  /** Approved facts (approved_at set) for approved events in the window. */
  approvedFacts(filter: { from?: Date; to?: Date; eventIds?: readonly string[] }): Promise<(KpiFactRec & { event: EventRec })[]>;
  estimates(filter: { fromMonth?: string; toMonth?: string }): Promise<EstimateRec[]>;
  /** Article slugs linked to events via article_i18n.event_id. */
  articleSlugsForEvents(eventIds: readonly string[]): Promise<Map<string, string>>;

  /** Published articles linked (article_i18n.event_id) to any of the events, newest first. */
  articlesForEvents(eventIds: readonly string[], limit: number): Promise<ArticleRec[]>;
  /** Redirect row by normalised path (no trailing slash). */
  redirectByPath(path: string): Promise<RedirectRec | null>;
  /** Fire-and-forget hit counter. */
  redirectHit(path: string): Promise<void>;

  listArticles(filter: ArticleFilter): Promise<{ rows: ArticleRec[]; total: number }>;
  articleBySlug(slug: string): Promise<ArticleRec | null>;
  /** Published neighbours by publish date (any category). */
  articleNeighbours(article: ArticleRec): Promise<{ prev: ArticleRec | null; next: ArticleRec | null }>;

  contentItems(kind: ContentKind): Promise<ContentItemRec[]>;
  /** Legacy home slider images, in display order (gallery "Highlights"). */
  sliderImages(): Promise<SliderImageRec[]>;

  createPrivacyRequest(rec: PrivacyRequestRec, audit: AuditRec): Promise<void>;
}
