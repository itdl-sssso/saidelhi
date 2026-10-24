import type { ArticleCategoryFilter, ImpactPeriod, SevaType, ValueSlug, Wing } from "./enums";

export const API_BASE = "/api/v1";

type QueryValue = string | number | boolean | null | undefined;

/** Builds `path?query`, skipping null/undefined/empty values. */
export function withQuery(path: string, query?: object): string {
  if (!query) return path;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(query) as [string, QueryValue][]) {
    if (v === undefined || v === null || v === "") continue;
    qs.set(k, String(v));
  }
  const s = qs.toString();
  return s ? `${path}?${s}` : path;
}

const p = (path: string) => `${API_BASE}${path}`;
const seg = encodeURIComponent;

export interface PageQuery {
  page?: number;
  pageSize?: number;
}

export interface EventsQueryParams extends PageQuery {
  from?: string;
  to?: string;
  district?: string;
  sevaType?: SevaType;
  samithi?: string;
  needsVolunteers?: boolean;
}

/** Path builders for the public API (§5.1) and /health. */
export const endpoints = {
  health: () => p("/health"),
  home: () => p("/home"),
  value: (slug: ValueSlug) => p(`/values/${seg(slug)}`),
  impact: (q?: { period?: ImpactPeriod; district?: string }) => withQuery(p("/impact"), q),
  programs: (q?: { wing?: Wing }) => withQuery(p("/programs"), q),
  program: (type: SevaType) => p(`/programs/${seg(type)}`),
  articles: (q?: { c?: ArticleCategoryFilter } & PageQuery) => withQuery(p("/articles"), q),
  article: (slug: string) => p(`/articles/${seg(slug)}`),
  events: (q?: EventsQueryParams) => withQuery(p("/events"), q),
  event: (id: string) => p(`/events/${seg(id)}`),
  join: (q?: { district?: string; sevaType?: SevaType; from?: string; to?: string } & PageQuery) => withQuery(p("/join"), q),
  centres: (q?: { q?: string; district?: string; pincode?: string } & PageQuery) => withQuery(p("/centres"), q),
  centre: (slug: string) => p(`/centres/${seg(slug)}`),
  /** v0.6: DistrictSummary[] (About page, district index). */
  districts: () => p("/districts"),
  district: (slug: string) => p(`/districts/${seg(slug)}`),
  discourses: (q?: { theme?: string; q?: string }) => withQuery(p("/discourses"), q),
  discourse: (slug: string) => p(`/discourses/${seg(slug)}`),
  privacyRequests: () => p("/privacy/requests"),
  redirects: (path: string) => withQuery(p("/redirects"), { path }),
  /** v0.5: OrgUnit[] for filters (active units only). */
  orgUnits: (q: { kind: "district" | "samithi"; district?: string }) => withQuery(p("/org/units"), q),
  /** v0.5: public WhatsApp opt-in (OptInBody) → 202. */
  whatsappOptIn: () => p("/whatsapp/optin"),
} as const;

export type EndpointName = keyof typeof endpoints;

/** Form-link API (§5.2). The token is a path segment; never log or render it. */
export const linkEndpoints = {
  info: (token: string) => p(`/links/${seg(token)}`),
  otp: (token: string) => p(`/links/${seg(token)}/otp`),
  verify: (token: string) => p(`/links/${seg(token)}/verify`),
  publicSession: (token: string) => p(`/links/${seg(token)}/public`),
  form: (token: string) => p(`/links/${seg(token)}/form`),
  submissions: (token: string) => p(`/links/${seg(token)}/submissions`),
  submission: (token: string, id: string) => p(`/links/${seg(token)}/submissions/${seg(id)}`),
  attachments: (token: string) => p(`/links/${seg(token)}/attachments`),
} as const;

/** Page route of a form link (`/f/<token>`, `/hi/f/<token>`). */
export const formLinkPath = (token: string, locale: "en" | "hi" = "en") =>
  `${locale === "hi" ? "/hi" : ""}/f/${seg(token)}`;

/** Headers the form-link mutations need: CSRF double-submit + idempotency. */
export const LINK_HEADERS = { csrf: "x-csrf", idempotencyKey: "idempotency-key" } as const;
export const LINK_COOKIES = { session: "fsid", csrf: "csrf" } as const;

/** Portal auth (§5.3). */
export const authEndpoints = {
  otp: () => p("/auth/otp"),
  verify: () => p("/auth/verify"),
  logout: () => p("/auth/logout"),
  me: () => p("/auth/me"),
} as const;

type AdminEventAction = "submit" | "approve-plan" | "approve-report" | "request-changes" | "cancel" | "postpone" | "reopen";

/** Portal API (§5.4). Query objects mirror the zod query schemas in portal.ts. */
export const adminEndpoints = {
  overview: (q?: { scope?: string }) => withQuery(p("/admin/overview"), q),
  events: (q?: object) => withQuery(p("/admin/events"), q),
  event: (id: string) => p(`/admin/events/${seg(id)}`),
  eventAction: (id: string, action: AdminEventAction) => p(`/admin/events/${seg(id)}/${action}`),
  eventLinks: (id: string) => p(`/admin/events/${seg(id)}/links`),
  bulkResendLinks: () => p("/admin/events/bulk/resend-links"),
  links: (q?: object) => withQuery(p("/admin/links"), q),
  linkAction: (id: string, action: "resend" | "extend" | "revoke") => p(`/admin/links/${seg(id)}/${action}`),
  linkQrPdf: (id: string) => p(`/admin/links/${seg(id)}/qr.pdf`),
  approvals: (q?: { tab?: "plans" | "reports" | "escalated" } & PageQuery) => withQuery(p("/admin/approvals"), q),
  approvalsBulk: () => p("/admin/approvals/bulk"),
  orgTree: () => p("/admin/org/tree"),
  org: () => p("/admin/org"),
  orgUnit: (id: string) => p(`/admin/org/${seg(id)}`),
  orgAction: (id: string, action: "merge" | "deactivate") => p(`/admin/org/${seg(id)}/${action}`),
  people: (q?: object) => withQuery(p("/admin/people"), q),
  invite: () => p("/admin/people/invite"),
  person: (id: string) => p(`/admin/people/${seg(id)}`),
  deactivatePerson: (id: string) => p(`/admin/people/${seg(id)}/deactivate`),
  audit: (q?: object) => withQuery(p("/admin/audit"), q),
  attachment: (id: string) => p(`/admin/attachments/${seg(id)}`),
  // v0.5 (M4)
  inbox: (q?: { tab?: "for_me" | "escalated" | "done" } & PageQuery) => withQuery(p("/admin/inbox"), q),
  inboxItem: (id: string) => p(`/admin/inbox/${seg(id)}`),
  inboxAction: (id: string, action: "approve" | "escalate" | "reject" | "ask") => p(`/admin/inbox/${seg(id)}/${action}`),
  waTemplates: () => p("/admin/whatsapp/templates"),
  waReminders: () => p("/admin/whatsapp/reminders"),
  waReminder: (id: string) => p(`/admin/whatsapp/reminders/${seg(id)}`),
  waBroadcasts: () => p("/admin/whatsapp/broadcasts"),
  waLog: (q?: { q?: string } & PageQuery) => withQuery(p("/admin/whatsapp/log"), q),
  waConversation: (id: string) => p(`/admin/whatsapp/log/${seg(id)}`),
  waStatus: () => p("/admin/whatsapp/status"),
  // v0.7 (M6) — forms (30–31)
  forms: () => p("/admin/forms"),
  form: (id: string) => p(`/admin/forms/${seg(id)}`),
  formAction: (id: string, action: "publish" | "duplicate" | "test") => p(`/admin/forms/${seg(id)}/${action}`),
  formVersions: (id: string) => p(`/admin/forms/${seg(id)}/versions`),
  formVersion: (id: string, version: number) => p(`/admin/forms/${seg(id)}/versions/${version}`),
  formTemplateXlsx: (id: string, q?: { samithi?: string; version?: number }) => withQuery(p(`/admin/forms/${seg(id)}/template.xlsx`), q),
  formChangeRequests: (id: string) => p(`/admin/forms/${seg(id)}/change-requests`),
  changeRequest: (id: string) => p(`/admin/forms/change-requests/${seg(id)}`),
  // uploads (33)
  uploads: (q?: { status?: string; sevaType?: SevaType } & PageQuery) => withQuery(p("/admin/uploads"), q),
  upload: (id: string) => p(`/admin/uploads/${seg(id)}`),
  uploadConfirm: (id: string) => p(`/admin/uploads/${seg(id)}/confirm`),
  uploadErrorsXlsx: (id: string) => p(`/admin/uploads/${seg(id)}/errors.xlsx`),
  uploadOriginal: (id: string) => p(`/admin/uploads/${seg(id)}/original`),
  uploadOptions: () => p("/admin/uploads/options"),
  uploadTemplateXlsx: (q: { sevaType: SevaType; samithi?: string }) => withQuery(p("/admin/uploads/template.xlsx"), q),
  uploadToInbox: () => p("/admin/uploads/inbox"),
  // centres (35) + partners (36)
  centres: (q?: { q?: string; district?: string; active?: boolean } & PageQuery) => withQuery(p("/admin/centres"), q),
  centre: (id: string) => p(`/admin/centres/${seg(id)}`),
  centrePhotos: (id: string) => p(`/admin/centres/${seg(id)}/photos`),
  partners: (q?: { q?: string; kind?: string; city?: string; active?: boolean } & PageQuery) => withQuery(p("/admin/partners"), q),
  partner: (id: string) => p(`/admin/partners/${seg(id)}`),
  // content (38)
  content: (q?: { tab?: string; status?: string; lang?: "hi_missing"; district?: string; q?: string } & PageQuery) => withQuery(p("/admin/content"), q),
  contentItem: (id: string) => p(`/admin/content/${seg(id)}`),
  contentFromEvent: (eventId: string) => p(`/admin/content/from-event/${seg(eventId)}`),
  contentMedia: () => p("/admin/content/media"),
  thoughts: (q: { from: string; to: string }) => withQuery(p("/admin/content/thoughts"), q),
  thoughtsImport: () => p("/admin/content/thoughts/import"),
  // impact controls (40)
  impactControls: () => p("/admin/impact"),
  impactEstimates: (q?: { district?: string; year?: number } & PageQuery) => withQuery(p("/admin/impact/estimates"), q),
  impactEstimate: (id: string) => p(`/admin/impact/estimates/${seg(id)}`),
  // migration + redirects (41)
  migrationRuns: () => p("/admin/migration/runs"),
  migrationRun: (id: string) => p(`/admin/migration/runs/${seg(id)}`),
  migrationImport: (id: string) => p(`/admin/migration/runs/${seg(id)}/import`),
  migrationReportCsv: (id: string) => p(`/admin/migration/runs/${seg(id)}/report.csv`),
  redirects: (q?: { q?: string; source?: string } & PageQuery) => withQuery(p("/admin/redirects"), q),
  redirectDelete: (from: string) => withQuery(p("/admin/redirects"), { from }),
  // volunteers (43)
  volunteers: (q?: { samithi?: string; district?: string; when?: "next30" | "upcoming" | "past" } & PageQuery) => withQuery(p("/admin/volunteers"), q),
  volunteerSignups: (eventId: string) => p(`/admin/volunteers/${seg(eventId)}`),
  volunteerNotify: () => p("/admin/volunteers/notify"),
  // reports + exports (44)
  reports: () => p("/admin/reports"),
  monthlyReports: () => p("/admin/reports/monthly"),
  monthlyReportPdf: (id: string) => p(`/admin/reports/monthly/${seg(id)}.pdf`),
  reportSchedule: (id: string) => p(`/admin/reports/schedules/${seg(id)}`),
  exports: () => p("/admin/exports"),
  // data health (45)
  health: (q?: { scope?: string; from?: string; to?: string }) => withQuery(p("/admin/health"), q),
  // follow-up (46)
  followUp: (q?: { status?: string; q?: string; event?: string; waitingMin?: number } & PageQuery) => withQuery(p("/admin/follow-up"), q),
  followUpItem: (id: string) => p(`/admin/follow-up/${seg(id)}`),
  followUpReveal: (id: string) => p(`/admin/follow-up/${seg(id)}/reveal-phone`),
  followUpCalls: (id: string) => p(`/admin/follow-up/${seg(id)}/calls`),
  // privacy (47)
  privacy: () => p("/admin/privacy"),
  privacyDpo: () => p("/admin/privacy/dpo"),
  privacyRequests: (q?: { status?: string } & PageQuery) => withQuery(p("/admin/privacy/requests"), q),
  privacyRequest: (id: string) => p(`/admin/privacy/requests/${seg(id)}`),
  privacyRequestAction: (id: string, action: "find" | "erase" | "reply") => p(`/admin/privacy/requests/${seg(id)}/${action}`),
  privacyRequestExport: (id: string) => p(`/admin/privacy/requests/${seg(id)}/export.json`),
  privacyConsents: () => p("/admin/privacy/consents"),
  privacyRetention: () => p("/admin/privacy/retention"),
  privacyRetentionJob: (key: string) => p(`/admin/privacy/retention/${seg(key)}`),
  privacyBreaches: () => p("/admin/privacy/breaches"),
  privacyBreach: (id: string) => p(`/admin/privacy/breaches/${seg(id)}`),
  // settings (49)
  settings: () => p("/admin/settings"),
  settingsSevaTypes: () => p("/admin/settings/seva-types"),
  settingsSevaType: (code: SevaType) => p(`/admin/settings/seva-types/${seg(code)}`),
  settingsKpis: () => p("/admin/settings/kpis"),
  settingsKpi: (key: string) => p(`/admin/settings/kpis/${seg(key)}`),
  settingsStrings: (q?: { q?: string; missing?: boolean; ns?: string } & PageQuery) => withQuery(p("/admin/settings/strings"), q),
  // v0.8 (M7) — discourses workspace (39)
  discourses: (q?: { q?: string; theme?: string; status?: string; reviewer?: string } & PageQuery) => withQuery(p("/admin/discourses"), q),
  discourse: (id: string) => p(`/admin/discourses/${seg(id)}`),
  discourseAction: (id: string, action: "ai-draft" | "send-review" | "approve" | "publish" | "unpublish") =>
    p(`/admin/discourses/${seg(id)}/${action}`),
  discourseMedia: (id: string, mediaId: string) => p(`/admin/discourses/${seg(id)}/media/${seg(mediaId)}`),
  discourseGlossary: () => p("/admin/discourses/glossary"),
} as const;

/** v0.5 dev-only bot simulator (404 unless WHATSAPP_PROVIDER=console and NODE_ENV!=production). */
export const devWhatsappEndpoints = {
  inbound: () => p("/dev/whatsapp/inbound"),
  messages: (phone: string) => withQuery(p("/dev/whatsapp/messages"), { phone }),
  reset: () => p("/dev/whatsapp/reset"),
} as const;
