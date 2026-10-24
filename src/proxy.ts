import { type NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { PORTAL_COOKIES } from "./contract/auth";
import { isLegacyPath, SevaType, ValueSlug } from "./contract";
import { routing } from "./i18n/routing";

const intl = createMiddleware(routing);

/**
 * Detail routes whose id/slug can be unknown. Their layouts stream (Cache Components: params must sit
 * under Suspense), so a `notFound()` in the page would arrive as 200. The proxy runs before rendering
 * (Next docs: guides/streaming, "The HTTP contract"), so it probes existence and rewrites unknown
 * ones to the localised catch-all, which answers a real 404.
 */
const DETAIL_PATH =
  /^(?:\/(hi))?(?:\/(events|centres|news|districts|programs|values|discourses)\/([^/]+)|\/admin\/events\/([^/]+)(?:\/edit)?)\/?$/;
const DISCOURSE_LIST = /^(?:\/(hi))?\/discourses$/;
const PROBE_TTL_MS = 60_000;
const found = new Map<string, number>(); // positive probes only: a new id must 404 -> 200 immediately

type ProbeKind = "event" | "adminEvent" | "centre" | "article" | "district" | "program" | "value" | "discourse";

const PROBE_KIND: Record<string, ProbeKind> = {
  events: "event",
  centres: "centre",
  news: "article",
  districts: "district",
  programs: "program",
  values: "value",
  discourses: "discourse",
};

async function exists(kind: ProbeKind, key: string): Promise<boolean> {
  if (key.length > 120) return false;
  if (kind === "value") return ValueSlug.safeParse(key).success; // fixed set, no lookup
  if (kind === "discourse") {
    // Not cached: the flag can flip at any time and must take effect at once.
    const { services } = await import("./server/services");
    return services().discourses.exists(key);
  }
  const k = `${kind}:${key}`;
  const hit = found.get(k);
  if (hit && hit > Date.now()) return true;
  const { services } = await import("./server/services");
  const svc = services();
  let ok: boolean;
  switch (kind) {
    case "centre":
      ok = !!(await svc.centres.bySlug(key));
      break;
    case "article":
      ok = await svc.articles.exists(key);
      break;
    case "district":
      ok = (await svc.districts.units({ kind: "district" })).some((u) => u.slug === key);
      break;
    case "program":
      ok = SevaType.safeParse(key).success && (await svc.programs.exists(key));
      break;
    default:
      ok = await svc.events.exists(key, kind === "event");
  }
  if (ok) {
    if (found.size > 2000) found.clear();
    found.set(k, Date.now() + PROBE_TTL_MS);
  }
  return ok;
}

/**
 * Cold start: the first DB call can fail while the pool warms up, which used to read as "exists" (200 on
 * an unknown id). Retry once; only a persistent error fails open (page reports it). Errors are never cached.
 */
async function probe(kind: ProbeKind, key: string): Promise<boolean> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await exists(kind, key);
    } catch (e) {
      if (attempt === 1) console.error("[proxy] existence probe failed twice, failing open", kind, e instanceof Error ? e.message : e);
      else await new Promise((r) => setTimeout(r, 150));
    }
  }
  return true;
}


/**
 * A real 404 for a rewritten not-found page. In production the catch-all is a PPR shell: the router
 * applies the rewrite's `status` only in dev, prod serves the shell with 200 (x-nextjs-postponed).
 * A response body produced by the proxy itself keeps its status, so fetch the rendered page from this
 * server and return it as 404. Loopback origin (PORT) avoids a round trip through the public proxy.
 * Falls back to the rewrite if the inner fetch fails.
 */
async function notFoundResponse(req: NextRequest, locale: string | undefined, search = ""): Promise<NextResponse> {
  const path = `${locale === "hi" ? "/hi" : ""}/__not-found${search}`;
  try {
    const port = process.env.PORT || req.nextUrl.port || "3000";
    const res = await fetch(new URL(path, `http://127.0.0.1:${port}`), {
      headers: { "x-nf-inner": "1", "accept-language": req.headers.get("accept-language") ?? "", cookie: req.headers.get("cookie") ?? "" },
      redirect: "manual",
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok && res.body) {
      const headers = new Headers({ "content-type": res.headers.get("content-type") ?? "text/html; charset=utf-8", "cache-control": "private, no-store" });
      return new NextResponse(res.body, { status: 404, headers });
    }
  } catch {
    /* fall through to the rewrite */
  }
  const url = req.nextUrl.clone();
  url.pathname = `/${locale ?? "en"}/__not-found`;
  url.search = search;
  return NextResponse.rewrite(url, { status: 404 });
}

async function redirectFor(pathname: string) {
  try {
    const { services } = await import("./server/services");
    return await services().redirects.resolve(pathname);
  } catch {
    return null;
  }
}

/** Old Django URLs: 301 to the new page, or the "This page moved" 404 when no rule matches. */
async function legacy(req: NextRequest): Promise<NextResponse> {
  const { pathname } = req.nextUrl;
  try {
    const { services } = await import("./server/services");
    const target = await services().redirects.resolve(pathname);
    if (target) {
      const url = new URL(target.to, req.nextUrl.origin);
      return NextResponse.redirect(url, target.permanent ? 301 : 302);
    }
  } catch {
    /* DB down: show the moved page rather than a 500 */
  }
  return notFoundResponse(req, undefined, "?moved=1");
}

/** `/admin/...` or `/hi/admin/...`, excluding the login page itself. */
const PORTAL_PATH = /^(\/hi)?(\/admin(?:\/.*)?)$/;

/** UI term is "Sevadal": the old portal URL moved. Keeps /hi, sub-paths and the query string. */
const OLD_SEVADAL = /^(\/hi)?\/admin\/volunteers(\/.*)?$/;

export default async function proxy(req: NextRequest) {
  if (req.headers.get("x-nf-inner")) return intl(req); // inner not-found fetch: just render
  const old = OLD_SEVADAL.exec(req.nextUrl.pathname);
  if (old) {
    const url = req.nextUrl.clone();
    url.pathname = `${old[1] ?? ""}/admin/sevadal${old[2] ?? ""}`;
    return NextResponse.redirect(url, 301);
  }
  if (isLegacyPath(req.nextUrl.pathname)) return legacy(req);
  // skipTrailingSlashRedirect is on (legacy URLs must 301 once), so normalise other trailing slashes here.
  if (req.nextUrl.pathname.length > 1 && req.nextUrl.pathname.endsWith("/")) {
    const url = new URL(req.nextUrl.pathname.replace(/\/+$/, "") + req.nextUrl.search, req.nextUrl.origin);
    return NextResponse.redirect(url, 308);
  }
  const match = PORTAL_PATH.exec(req.nextUrl.pathname);
  // Visitors with no session cookie go straight to the login page (a real 307, not a streamed redirect).
  // An expired or revoked cookie is caught by the page itself, which checks the session in the database.
  if (match && !match[2].startsWith("/admin/login") && !req.cookies.has(PORTAL_COOKIES.session)) {
    const url = req.nextUrl.clone();
    url.pathname = `${match[1] ?? ""}/admin/login`;
    url.search = "";
    url.searchParams.set("next", `${match[2]}${req.nextUrl.search}`);
    return NextResponse.redirect(url);
  }
  // The list page has no slug to probe: it only exists while the flag is on.
  const list = DISCOURSE_LIST.exec(req.nextUrl.pathname);
  if (list) {
    const on = await import("./server/services").then((m) => m.services().flags.flags()).then((f) => f.discourses, () => true);
    if (!on) {
      return notFoundResponse(req, list[1]);
    }
  }
  const d = DETAIL_PATH.exec(req.nextUrl.pathname);
  if (d) {
    let key = d[3] ?? d[4];
    try {
      key = decodeURIComponent(key);
    } catch {
      /* malformed escape: probe the raw value, it will not exist */
    }
    // Static siblings of a dynamic segment are pages, not ids: `/centres/map`, `/admin/events/new`.
    const kind: ProbeKind | null = d[4]
      ? key === "new" && !d[0].endsWith("/edit") ? null : "adminEvent"
      : d[2] === "centres" && d[3] === "map" ? null : PROBE_KIND[d[2]];
    // A probe failure (DB down) falls through to the page, which reports its own error.
    const ok = kind === null || (await probe(kind, key));
    if (!ok) {
      // A retired slug may have a redirect rule (e.g. old districts -> /impact): honour it before the 404.
      const moved = await redirectFor(req.nextUrl.pathname);
      if (moved) return NextResponse.redirect(new URL(moved.to, req.nextUrl.origin), moved.permanent ? 301 : 302);
      return notFoundResponse(req, d[1]);
    }
  }
  return intl(req);
}

export const config = {
  matcher: "/((?!api|media/|_next|_vercel|.*\\..*).*)",
};
