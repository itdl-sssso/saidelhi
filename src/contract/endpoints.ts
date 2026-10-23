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
} as const;

/** v0.5 dev-only bot simulator (404 unless WHATSAPP_PROVIDER=console and NODE_ENV!=production). */
export const devWhatsappEndpoints = {
  inbound: () => p("/dev/whatsapp/inbound"),
  messages: (phone: string) => withQuery(p("/dev/whatsapp/messages"), { phone }),
  reset: () => p("/dev/whatsapp/reset"),
} as const;
