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
  /^(?:\/(hi))?(?:\/(events|centres|news|districts|programs|values)\/([^/]+)|\/admin\/events\/([^/]+)(?:\/edit)?)\/?$/;
const PROBE_TTL_MS = 60_000;
const found = new Map<string, number>(); // positive probes only: a new id must 404 -> 200 immediately

type ProbeKind = "event" | "adminEvent" | "centre" | "article" | "district" | "program" | "value";

const PROBE_KIND: Record<string, ProbeKind> = {
  events: "event",
  centres: "centre",
  news: "article",
  districts: "district",
  programs: "program",
  values: "value",
};

async function exists(kind: ProbeKind, key: string): Promise<boolean> {
  if (key.length > 120) return false;
  if (kind === "value") return ValueSlug.safeParse(key).success; // fixed set, no lookup
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
  const url = req.nextUrl.clone();
  url.pathname = "/en/__not-found";
  url.search = "?moved=1";
  // Rewrite keeps the page's 200; the explicit status makes the moved page a real 404.
  return NextResponse.rewrite(url, { status: 404 });
}

/** `/admin/...` or `/hi/admin/...`, excluding the login page itself. */
const PORTAL_PATH = /^(\/hi)?(\/admin(?:\/.*)?)$/;

export default async function proxy(req: NextRequest) {
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
  const d = DETAIL_PATH.exec(req.nextUrl.pathname);
  if (d) {
    let key = d[3] ?? d[4];
    try {
      key = decodeURIComponent(key);
    } catch {
      /* malformed escape: probe the raw value, it will not exist */
    }
    // `/centres/map` is the map page, not a centre.
    const kind: ProbeKind | null = d[4] ? "adminEvent" : d[2] === "centres" && d[3] === "map" ? null : PROBE_KIND[d[2]];
    // A probe failure (DB down) falls through to the page, which reports its own error.
    const ok = kind === null || (await exists(kind, key).catch(() => true));
    if (!ok) {
      const url = req.nextUrl.clone();
      url.pathname = `/${d[1] ?? "en"}/__not-found`;
      return NextResponse.rewrite(url);
    }
  }
  return intl(req);
}

export const config = {
  matcher: "/((?!api|media/|_next|_vercel|.*\\..*).*)",
};
