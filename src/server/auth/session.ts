// Portal session for Server Components (reads `sid` via cookies()). Call it
// inside a <Suspense> boundary (Cache Components). Cookies cannot be set while
// rendering, so renewal here only slides the DB expiry; API calls refresh the cookie.
import "server-only";
import { cookies, headers } from "next/headers";
import { type Me, type Permission, PORTAL_COOKIES } from "@/contract";
import { appSecret } from "../env";
import { clientIp, hashIp, requestIdFrom } from "../http/request";
import { services } from "../services";
import type { Actor } from "./rbac";

export interface PortalSession {
  actor: Actor;
  me: Me;
}

/** The signed-in coordinator, or null (redirect to /admin/login). */
export async function getSession(): Promise<PortalSession | null> {
  const token = (await cookies()).get(PORTAL_COOKIES.session)?.value;
  if (!token) return null;
  const h = await headers();
  const resolved = await services().auth.resolve(token, { requestId: requestIdFrom(h), ipHash: hashIp(clientIp(h), appSecret()) });
  if (!resolved) return null;
  return { actor: resolved.actor, me: await services().auth.me(resolved.actor) };
}

/** Convenience for pages: does the signed-in person hold this permission? */
export const hasPermission = (s: PortalSession | null, p: Permission) => !!s && s.actor.permissions.has(p);
