// Small typed fetch helper for client islands calling /api/v1 (CONTRACT §2).
// Paths come from the contract's endpoint builders; responses are unwrapped from
// the { data } / { error } envelopes so callers branch on `ok` only.
import { type ApiErrorBody, isErrorEnvelope } from "@/contract";
import type { AppLocale } from "./format";

export type ApiSuccess<T> = { ok: true; status: number; data: T };
export type ApiFailure = { ok: false; status: number; error: ApiErrorBody };
export type ApiResult<T> = ApiSuccess<T> | ApiFailure;

export type ApiRequestInit = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  locale?: AppLocale;
  signal?: AbortSignal;
  headers?: Record<string, string>;
};

/** Status 0 = the request never got an answer (offline, DNS, aborted). */
const networkFailure = (message: string): ApiFailure => ({
  ok: false,
  status: 0,
  error: { code: "INTERNAL", message },
});

export async function apiRequest<T>(url: string, init: ApiRequestInit = {}): Promise<ApiResult<T>> {
  const headers: Record<string, string> = { accept: "application/json", ...init.headers };
  if (init.locale) headers["accept-language"] = init.locale;
  if (init.body !== undefined) headers["content-type"] = "application/json";

  let res: Response;
  try {
    res = await fetch(url, {
      method: init.method ?? (init.body === undefined ? "GET" : "POST"),
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: init.signal,
      credentials: "same-origin",
    });
  } catch (err) {
    return networkFailure(err instanceof Error ? err.message : "Network error");
  }

  if (res.status === 204) return { ok: true, status: 204, data: undefined as T };

  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    // Non-JSON bodies (proxies, HTML error pages) are treated as server errors below.
  }

  if (res.ok && json && typeof json === "object" && "data" in json) {
    return { ok: true, status: res.status, data: (json as { data: T }).data };
  }
  if (isErrorEnvelope(json)) return { ok: false, status: res.status, error: json.error };
  return { ok: false, status: res.status, error: { code: "INTERNAL", message: res.statusText || "Unexpected response" } };
}
