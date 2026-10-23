import { type NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { PORTAL_COOKIES } from "./contract/auth";
import { routing } from "./i18n/routing";

const intl = createMiddleware(routing);

/**
 * Detail routes whose id/slug can be unknown. Their layouts stream (Cache Components: params must sit
 * under Suspense), so a `notFound()` in the page would arrive as 200. The proxy runs before rendering
 * (Next docs: guides/streaming, "The HTTP contract"), so it probes existence and rewrites unknown
 * ones to the localised catch-all, which answers a real 404.
 */
const DETAIL_PATH = /^(?:\/(hi))?(?:\/(events|centres)\/([^/]+)|\/admin\/events\/([^/]+)(?:\/edit)?)\/?$/;
const PROBE_TTL_MS = 60_000;
const found = new Map<string, number>(); // positive probes only: a new id must 404 -> 200 immediately

async function exists(kind: "event" | "adminEvent" | "centre", key: string): Promise<boolean> {
  if (key.length > 120) return false;
  const k = `${kind}:${key}`;
  const hit = found.get(k);
  if (hit && hit > Date.now()) return true;
  const { services } = await import("./server/services");
  const svc = services();
  const ok = kind === "centre" ? !!(await svc.centres.bySlug(key)) : await svc.events.exists(key, kind === "event");
  if (ok) {
    if (found.size > 2000) found.clear();
    found.set(k, Date.now() + PROBE_TTL_MS);
  }
  return ok;
}

/** `/admin/...` or `/hi/admin/...`, excluding the login page itself. */
const PORTAL_PATH = /^(\/hi)?(\/admin(?:\/.*)?)$/;

export default async function proxy(req: NextRequest) {
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
    const kind = d[4] ? "adminEvent" : d[2] === "centres" ? "centre" : "event";
    // A probe failure (DB down) falls through to the page, which reports its own error.
    const ok = await exists(kind, key).catch(() => true);
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
