import type {
  AnswerMap,
  FormDefinition,
  FormLink,
  FormPayload,
  LinkAttachment,
  LinkInfo,
  LinkPurpose,
  LinkSession,
  Locale,
  OtpSent,
  PublicSessionRequest,
  Submission,
  SubmissionPatch,
  Article,
  ArticleDetail,
  ArticlesQuery,
  CentreDetail,
  CentreListItem,
  CentresQuery,
  DistrictPayload,
  OrgUnit,
  OrgUnitsQuery,
  EventPublic,
  EventsQuery,
  FeatureFlags,
  HomePayload,
  ImpactPayload,
  ImpactQuery,
  Paged,
  PrivacyRequestParsed,
} from "@/contract";
import type { CacheTag } from "../cache";
import type { PrivateStorage } from "../files";
import type { EmailProvider } from "../providers/email";
import type { WhatsAppProvider } from "../providers/whatsapp/types";
import type { Extractor } from "../ai/types";
import type { AuthService } from "./auth";
import type { WaServices } from "./wa";
import type { PortalServices } from "./portal";
import type { LinkRec } from "../repo/links-types";

export interface HomeService {
  get(): Promise<HomePayload>;
}

export interface EventsService {
  /** Public statuses only; defaults to upcoming (from = today IST). */
  list(q: EventsQuery): Promise<Paged<EventPublic>>;
  /** null when missing or not public. */
  byId(id: string): Promise<EventPublic | null>;
  /** Cheap existence probe (proxy 404 check). `publicOnly` mirrors `byId` visibility; portal routes pass false. */
  exists(id: string, publicOnly: boolean): Promise<boolean>;
}

export interface CentresService {
  list(q: CentresQuery): Promise<Paged<CentreListItem>>;
  bySlug(slug: string): Promise<CentreDetail | null>;
}

export interface DistrictsService {
  bySlug(slug: string): Promise<DistrictPayload | null>;
  /** Active districts, or active samithis (optionally of one district), in display order. */
  units(q: OrgUnitsQuery): Promise<OrgUnit[]>;
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

/** Result of verify/public: the route sets `fsid` (httpOnly) and `csrf` cookies from it. */
export interface SessionGrant {
  session: LinkSession;
  sessionToken: string;
  csrf: string;
  maxAgeSeconds: number;
}

export interface NewLinkOptions {
  label?: string;
  /** Phone (E.164 or Indian 10-digit) for WhatsApp delivery, or 'qr' for a printed poster. */
  sendTo?: string | "qr";
  recipientLabel?: string;
  expiresAt?: Date;
  maxUses?: number | null;
  /** Desk links only; report links always need OTP, public links never. */
  otpRequired?: boolean;
  createdBy?: string;
  /** Send `form_link_sent` on WhatsApp right away. */
  send?: boolean;
  lang?: Locale;
}

export interface ExternalSubmission {
  eventId: string;
  answers: AnswerMap;
  source: "whatsapp" | "upload" | "scan";
  /** Shown on the timeline ("Coordinator A"). */
  byLabel: string;
  byHash: string | null;
  byMasked: string;
  locale: Locale;
  idempotencyKey?: string | null;
}

export interface UploadedFile {
  name: string;
  bytes: Uint8Array;
}

export interface LinksService {
  /** GET /links/:token. Throws 404 for unknown tokens, 410 (with details) for closed links. */
  info(token: string, sessionToken: string | null): Promise<LinkInfo>;
  sendOtp(token: string, phone: string, locale: Locale): Promise<OtpSent>;
  verify(token: string, phone: string, code: string, locale: Locale): Promise<SessionGrant>;
  /** null when the honeypot was filled (answer as if it worked, set nothing). */
  startPublic(token: string, input: PublicSessionRequest): Promise<SessionGrant | null>;
  form(token: string, sessionToken: string | null, locale: Locale): Promise<FormPayload>;
  submit(
    token: string,
    sessionToken: string | null,
    idempotencyKey: string,
    answers: AnswerMap,
    locale: Locale,
  ): Promise<{ submission: Submission; replayed: boolean }>;
  update(token: string, sessionToken: string | null, id: string, patch: SubmissionPatch, locale: Locale): Promise<Submission>;
  attach(
    token: string,
    sessionToken: string | null,
    file: UploadedFile,
    fieldId: string,
    idempotencyKey: string | null,
    locale: Locale,
  ): Promise<LinkAttachment>;

  /** The report form locked to the event and its prefilled answers (chat report flow, inbox). */
  reportContext(eventId: string, locale: Locale): Promise<{ definition: FormDefinition; prefill: AnswerMap }>;
  /**
   * Report arriving outside a form link (WhatsApp chat, inbox approval). Validated
   * against the locked form; moves the event to report_submitted and notifies the district.
   */
  submitExternal(input: ExternalSubmission): Promise<Submission>;

  // Portal helpers (M3 wraps these with RBAC).
  /** The token is returned once, for immediate delivery; FormLink.url can be rebuilt later. */
  createLink(eventId: string, purpose: LinkPurpose, opts?: NewLinkOptions): Promise<{ link: FormLink; token: string }>;
  addAllowedPhone(eventId: string, phone: string, label: string | null): Promise<void>;
  revokeLink(linkId: string): Promise<FormLink>;
  extendLink(linkId: string, until: Date): Promise<FormLink>;
  listLinksForEvent(eventId: string): Promise<FormLink[]>;
  /** Re-sends `form_link_sent` to the phone the link was issued to. */
  resendLink(linkId: string, lang?: Locale): Promise<FormLink>;
  linkUrl(link: LinkRec, locale?: Locale): string;
  /** FormLink DTO for a stored link (portal lists). */
  describe(link: LinkRec): FormLink;
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
  links: LinksService;
  /** Portal sign-in and sessions (§5.3). */
  auth: AuthService;
  /** Coordinator portal (§5.4) and jobs. */
  portal: PortalServices;
  /** WhatsApp bot, review inbox, admin and opt-in (M4). */
  wa: WaServices;
}

export interface ServiceDeps {
  now: () => Date;
  /** Public URL prefix for legacy media paths. */
  mediaBase: string;
  /** Root secret (link tokens, keyed hashes, CSRF). Defaults to the dev secret. */
  secret?: string;
  whatsapp?: WhatsAppProvider;
  /** Login-code fallback channel. */
  email?: EmailProvider;
  storage?: PrivateStorage;
  /** Origin for form-link URLs. */
  appUrl?: string;
  /** Called after mutations that change public data. */
  revalidate?: (tags: readonly CacheTag[]) => void;
  /** Turns chat text into draft report answers (rules by default). */
  extractor?: Extractor;
}

export type LinkServiceDeps = Required<ServiceDeps> & {
  /** Called after a report is received or corrected (portal notifies the district). */
  onReportSubmitted: (eventId: string) => Promise<void>;
};
