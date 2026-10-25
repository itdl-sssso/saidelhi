import type { NextRequest } from "next/server";
import { LINK_COOKIES, LINK_HEADERS } from "@/contract";
import { appSecret } from "../env";
import { csrfValid } from "../security/link-token";
import type { SessionGrant } from "../services/types";
import { ApiError } from "./errors";

export const sessionTokenOf = (req: NextRequest): string | null => req.cookies.get(LINK_COOKIES.session)?.value ?? null;

/** Cookie-authenticated mutations need `x-csrf` equal to the `csrf` cookie, bound to the session (§2). */
export function requireCsrf(req: NextRequest): string {
  const token = sessionTokenOf(req);
  if (!token) throw new ApiError("UNAUTHENTICATED");
  const ok = csrfValid(appSecret(), token, req.headers.get(LINK_HEADERS.csrf), req.cookies.get(LINK_COOKIES.csrf)?.value ?? null);
  if (!ok) throw new ApiError("FORBIDDEN", { message: "Missing or invalid CSRF token" });
  return token;
}

const IDEMPOTENCY_RE = /^[A-Za-z0-9_-]{8,100}$/;

export function idempotencyKeyOf(req: NextRequest, required: true): string;
export function idempotencyKeyOf(req: NextRequest, required: false): string | null;
export function idempotencyKeyOf(req: NextRequest, required: boolean): string | null {
  const key = req.headers.get(LINK_HEADERS.idempotencyKey)?.trim() ?? "";
  if (!key) {
    if (required) throw new ApiError("BAD_REQUEST", { fields: { "Idempotency-Key": "Required (UUID from the client draft)" } });
    return null;
  }
  if (!IDEMPOTENCY_RE.test(key)) throw new ApiError("BAD_REQUEST", { fields: { "Idempotency-Key": "8–100 characters: letters, digits, - or _" } });
  return key;
}

function cookie(name: string, value: string, maxAge: number, httpOnly: boolean): string {
  const parts = [`${name}=${value}`, "Path=/", `Max-Age=${maxAge}`, "SameSite=Lax"];
  // Dev over plain-http LAN (phone testing): browsers drop Secure cookies off localhost.
  if (process.env.NODE_ENV === "production" || process.env.DEV_INSECURE_COOKIES !== "1") parts.push("Secure");
  if (httpOnly) parts.push("HttpOnly");
  return parts.join("; ");
}

/** `fsid` (httpOnly) + `csrf` (readable by the form app, echoed as `x-csrf`). */
export function withSessionCookies(res: Response, grant: SessionGrant): Response {
  res.headers.append("set-cookie", cookie(LINK_COOKIES.session, grant.sessionToken, grant.maxAgeSeconds, true));
  res.headers.append("set-cookie", cookie(LINK_COOKIES.csrf, grant.csrf, grant.maxAgeSeconds, false));
  return res;
}
