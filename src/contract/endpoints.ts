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
  join: (q?: { district?: string; sevaType?: SevaType; from?: string; to?: string }) => withQuery(p("/join"), q),
  centres: (q?: { q?: string; district?: string } & PageQuery) => withQuery(p("/centres"), q),
  centre: (slug: string) => p(`/centres/${seg(slug)}`),
  district: (slug: string) => p(`/districts/${seg(slug)}`),
  discourses: (q?: { theme?: string; q?: string }) => withQuery(p("/discourses"), q),
  discourse: (slug: string) => p(`/discourses/${seg(slug)}`),
  privacyRequests: () => p("/privacy/requests"),
  redirects: (path: string) => withQuery(p("/redirects"), { path }),
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
