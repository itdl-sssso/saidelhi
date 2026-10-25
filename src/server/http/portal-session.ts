// Portal session plumbing for route handlers: `sid`/`csrf` cookies, the
// session + permission gate, and `adminRoute` (route() + gate + sliding renewal).
import "server-only";
import type { NextRequest } from "next/server";
import type { z } from "zod";
import { type Permission, PORTAL_COOKIES, PORTAL_HEADERS } from "@/contract";
import { type Actor, assertCan, type RequestContext } from "../auth/rbac";
import { appSecret } from "../env";
import { csrfValid } from "../security/link-token";
import { services } from "../services";
import type { PortalGrant, ResolvedSession } from "../services/auth";
import { ApiError } from "./errors";
import { clientIp, hashIp, requestIdFrom } from "./request";
import { type RouteArgs, type RouteSpec, route } from "./route";

const SAFE = new Set(["GET", "HEAD", "OPTIONS"]);

function cookie(name: string, value: string, maxAge: number, httpOnly: boolean): string {
  const parts = [`${name}=${value}`, "Path=/", `Max-Age=${maxAge}`, "SameSite=Lax"];
  // Dev over plain-http LAN (phone testing): browsers drop Secure cookies off localhost.
  if (process.env.NODE_ENV === "production" || process.env.DEV_INSECURE_COOKIES !== "1") parts.push("Secure");
  if (httpOnly) parts.push("HttpOnly");
  return parts.join("; ");
}

/** `sid` (httpOnly) + `csrf` (readable by the portal, echoed as `x-csrf`). */
export function withPortalCookies(res: Response, grant: PortalGrant): Response {
  res.headers.append("set-cookie", cookie(PORTAL_COOKIES.session, grant.token, grant.maxAgeSeconds, true));
  res.headers.append("set-cookie", cookie(PORTAL_COOKIES.csrf, grant.csrf, grant.maxAgeSeconds, false));
  return res;
}

export function clearPortalCookies(res: Response): Response {
  res.headers.append("set-cookie", cookie(PORTAL_COOKIES.session, "", 0, true));
  res.headers.append("set-cookie", cookie(PORTAL_COOKIES.csrf, "", 0, false));
  return res;
}

export const portalTokenOf = (req: NextRequest): string | null => req.cookies.get(PORTAL_COOKIES.session)?.value ?? null;

export function requestContext(req: NextRequest, requestId?: string): RequestContext {
  return { requestId: requestId ?? requestIdFrom(req.headers), ipHash: hashIp(clientIp(req.headers), appSecret()) };
}

/**
 * Resolves the portal session (401 when missing/expired), checks CSRF on
 * mutations (403) and, when given, the permission (403).
 */
export async function requireSession(req: NextRequest, permission?: Permission, rc?: RequestContext): Promise<ResolvedSession> {
  const token = portalTokenOf(req);
  if (!token) throw new ApiError("UNAUTHENTICATED");
  const session = await services().auth.resolve(token, rc ?? requestContext(req));
  if (!session) throw new ApiError("UNAUTHENTICATED");
  if (!SAFE.has(req.method)) {
    const ok = csrfValid(appSecret(), token, req.headers.get(PORTAL_HEADERS.csrf), req.cookies.get(PORTAL_COOKIES.csrf)?.value ?? null);
    if (!ok) throw new ApiError("FORBIDDEN", { message: "Missing or invalid CSRF token" });
  }
  if (permission) assertCan(session.actor, permission);
  return session;
}

export type AdminRouteArgs<Q, B, P> = RouteArgs<Q, B, P> & { actor: Actor; session: ResolvedSession };

const resolved = new WeakMap<NextRequest, ResolvedSession>();

/** route() for portal endpoints: session + CSRF + optional permission first; re-sends cookies when the session slid. */
export function adminRoute<
  Q extends z.ZodType | undefined = undefined,
  B extends z.ZodType | undefined = undefined,
  P extends z.ZodType | undefined = undefined,
>(spec: RouteSpec<Q, B, P> & { permission?: Permission }, handler: (args: AdminRouteArgs<Q, B, P>) => Promise<Response>) {
  return route(
    {
      ...spec,
      guard: async (req, requestId) => {
        resolved.set(req, await requireSession(req, spec.permission, requestContext(req, requestId)));
      },
    },
    async (args) => {
      const session = resolved.get(args.req);
      if (!session) throw new ApiError("UNAUTHENTICATED");
      const res = await handler({ ...args, actor: session.actor, session });
      return session.renewed ? withPortalCookies(res, session.renewed) : res;
    },
  );
}
