// Client fetch for the coordinator portal (CONTRACT §5.4): same envelopes as src/lib/api.ts,
// plus the CSRF double-submit header (`x-csrf` echoes the readable `csrf` cookie) on mutations.
import { PORTAL_COOKIES, PORTAL_HEADERS } from "@/contract";
import { type ApiRequestInit, type ApiResult, apiRequest } from "./api";

export type { ApiFailure, ApiResult, ApiSuccess } from "./api";

export function csrfToken(): string {
  if (typeof document === "undefined") return "";
  const prefix = `${PORTAL_COOKIES.csrf}=`;
  const hit = document.cookie.split("; ").find((c) => c.startsWith(prefix));
  return hit ? decodeURIComponent(hit.slice(prefix.length)) : "";
}

export function portalRequest<T>(url: string, init: ApiRequestInit = {}): Promise<ApiResult<T>> {
  const mutating = (init.method ?? (init.body === undefined ? "GET" : "POST")) !== "GET";
  return apiRequest<T>(url, {
    ...init,
    headers: { ...(mutating ? { [PORTAL_HEADERS.csrf]: csrfToken() } : {}), ...init.headers },
  });
}
