import type { NextRequest } from "next/server";
import type { z } from "zod";
import type { Locale } from "@/contract";
import { ApiError } from "./errors";
import { fail } from "./envelope";
import { issuesToFields } from "./messages";
import { clientIp, requestIdFrom, resolveLocale } from "./request";

type Out<S> = S extends z.ZodType ? z.output<S> : undefined;

export interface RouteSpec<Q extends z.ZodType | undefined, B extends z.ZodType | undefined, P extends z.ZodType | undefined> {
  query?: Q;
  body?: B;
  params?: P;
}

export interface RouteArgs<Q, B, P> {
  req: NextRequest;
  query: Out<Q>;
  body: Out<B>;
  params: Out<P>;
  locale: Locale;
  requestId: string;
  ip: string | null;
}

export type RouteContext = { params: Promise<Record<string, string | string[] | undefined>> };

const MAX_BODY_BYTES = 64 * 1024;

function queryObject(url: URL): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of url.searchParams) if (!(k in out)) out[k] = v;
  return out;
}

async function readJson(req: NextRequest): Promise<unknown> {
  const type = req.headers.get("content-type") ?? "";
  if (!type.includes("application/json")) throw new ApiError("BAD_REQUEST", { message: "Expected application/json" });
  const text = await req.text();
  if (text.length > MAX_BODY_BYTES) throw new ApiError("BAD_REQUEST", { message: "Body too large" });
  try {
    return JSON.parse(text);
  } catch {
    throw new ApiError("BAD_REQUEST");
  }
}

/**
 * Wraps a route handler: parses params/query/body with zod, resolves locale and
 * request id, maps thrown errors to §2 envelopes and stamps `x-request-id`.
 * Query/param problems → 400 BAD_REQUEST; body problems → 422 VALIDATION_FAILED.
 */
export function route<
  Q extends z.ZodType | undefined = undefined,
  B extends z.ZodType | undefined = undefined,
  P extends z.ZodType | undefined = undefined,
>(spec: RouteSpec<Q, B, P>, handler: (args: RouteArgs<Q, B, P>) => Promise<Response>) {
  return async (req: NextRequest, ctx: RouteContext): Promise<Response> => {
    const requestId = requestIdFrom(req.headers);
    const url = new URL(req.url);
    const locale = resolveLocale(url, req.headers);
    let res: Response;
    try {
      const parse = async <S extends z.ZodType | undefined>(
        schema: S,
        input: () => Promise<unknown> | unknown,
        code: "BAD_REQUEST" | "VALIDATION_FAILED",
      ): Promise<Out<S>> => {
        if (!schema) return undefined as Out<S>;
        const result = await schema.safeParseAsync(await input());
        if (!result.success) throw new ApiError(code, { fields: issuesToFields(result.error.issues, locale) });
        return result.data as Out<S>;
      };
      const params = await parse(spec.params as P, () => ctx.params, "BAD_REQUEST");
      const query = await parse(spec.query as Q, () => queryObject(url), "BAD_REQUEST");
      const body = await parse(spec.body as B, () => readJson(req), "VALIDATION_FAILED");
      res = await handler({ req, query, body, params, locale, requestId, ip: clientIp(req.headers) });
    } catch (err) {
      if (err instanceof ApiError) {
        res = fail(err, locale);
      } else {
        console.error(`[api] ${req.method} ${url.pathname} request_id=${requestId}`, err);
        res = fail(new ApiError("INTERNAL"), locale);
      }
    }
    res.headers.set("x-request-id", requestId);
    if (!res.headers.has("cache-control")) res.headers.set("cache-control", "no-store");
    res.headers.set("content-language", locale);
    return res;
  };
}
