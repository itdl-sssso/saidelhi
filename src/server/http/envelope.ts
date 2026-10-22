import type { ApiErrorBody, DataEnvelope, ErrorEnvelope, ListEnvelope, Locale, PageMeta } from "@/contract";
import { ApiError } from "./errors";
import { errorMessage } from "./messages";

export const okBody = <T>(data: T): DataEnvelope<T> => ({ data });
export const listBody = <T>(data: T[], meta: PageMeta): ListEnvelope<T> => ({ data, meta });

export function errorBody(err: ApiError, locale: Locale): ErrorEnvelope {
  const error: ApiErrorBody = { code: err.code, message: err.customMessage ?? errorMessage(err.code, locale) };
  if (err.fields && Object.keys(err.fields).length) error.fields = err.fields;
  if (err.retryAfter !== undefined) error.retryAfter = err.retryAfter;
  return { error };
}

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };

/** 200 `{ data }` */
export function ok<T>(data: T, init: ResponseInit = {}): Response {
  return Response.json(okBody(data), { status: 200, ...init, headers: { ...JSON_HEADERS, ...init.headers } });
}

/** 201 `{ data }` */
export function created<T>(data: T, init: ResponseInit = {}): Response {
  return ok(data, { ...init, status: 201 });
}

/** 200 `{ data, meta }` for list endpoints. */
export function list<T>(page: { data: T[]; meta: PageMeta }, init: ResponseInit = {}): Response {
  return Response.json(listBody(page.data, page.meta), { status: 200, ...init, headers: { ...JSON_HEADERS, ...init.headers } });
}

export function noContent(): Response {
  return new Response(null, { status: 204 });
}

/** `{ error }` with the HTTP status of its code (+ Retry-After when relevant). */
export function fail(err: ApiError, locale: Locale): Response {
  const headers: Record<string, string> = { ...JSON_HEADERS };
  if (err.retryAfter !== undefined) headers["retry-after"] = String(err.retryAfter);
  return Response.json(errorBody(err, locale), { status: err.status, headers });
}
