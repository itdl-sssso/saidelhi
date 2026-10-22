import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { ErrorEnvelope } from "@/contract";
import { created, errorBody, fail, list, listBody, ok, okBody } from "@/server/http/envelope";
import { ApiError } from "@/server/http/errors";
import { RateLimiter } from "@/server/http/rate-limit";
import { hashIp, resolveLocale } from "@/server/http/request";
import { route, type RouteContext } from "@/server/http/route";

const ctx = (params: Record<string, string> = {}): RouteContext => ({ params: Promise.resolve(params) });

describe("envelope helpers", () => {
  it("produce §2 shapes", async () => {
    expect(okBody({ a: 1 })).toEqual({ data: { a: 1 } });
    expect(listBody([1], { page: 1, pageSize: 25, total: 1 })).toEqual({ data: [1], meta: { page: 1, pageSize: 25, total: 1 } });

    const r = ok({ a: 1 });
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ data: { a: 1 } });
    expect(created({ id: "x" }).status).toBe(201);
    expect(await list({ data: [], meta: { page: 1, pageSize: 25, total: 0 } }).json()).toEqual({
      data: [],
      meta: { page: 1, pageSize: 25, total: 0 },
    });
  });

  it("errors carry code, localised message, fields and retryAfter", async () => {
    const err = new ApiError("RATE_LIMITED", { retryAfter: 30 });
    const res = fail(err, "hi");
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe("30");
    const body = ErrorEnvelope.parse(await res.json());
    expect(body.error).toMatchObject({ code: "RATE_LIMITED", retryAfter: 30 });
    expect(body.error.message).toMatch(/[ऀ-ॿ]/);

    expect(errorBody(new ApiError("NOT_FOUND"), "en")).toEqual({ error: { code: "NOT_FOUND", message: "We couldn't find that." } });
    expect(errorBody(new ApiError("VALIDATION_FAILED", { fields: {} }), "en").error.fields).toBeUndefined();
    expect(fail(new ApiError("LINK_EXPIRED"), "en").status).toBe(410);
  });
});

describe("route wrapper", () => {
  const handler = route(
    {
      params: z.object({ id: z.string().min(2) }),
      query: z.object({ n: z.coerce.number().int() }),
    },
    async ({ params, query, locale }) => ok({ id: params.id, n: query.n, locale }),
  );

  it("parses params and query, sets x-request-id", async () => {
    const res = await handler(new NextRequest("http://x/api/v1/t/ab?n=3"), ctx({ id: "ab" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ data: { id: "ab", n: 3, locale: "en" } });
    expect(res.headers.get("x-request-id")).toMatch(/^[0-9A-Z]{26}$/);
  });

  it("reuses a sane incoming request id", async () => {
    const req = new NextRequest("http://x/t?n=1", { headers: { "x-request-id": "proxy-1234abcd" } });
    const res = await handler(req, ctx({ id: "ab" }));
    expect(res.headers.get("x-request-id")).toBe("proxy-1234abcd");
  });

  it("bad query → 400 BAD_REQUEST with fields, in the request locale", async () => {
    const res = await handler(new NextRequest("http://x/t?n=abc&locale=hi"), ctx({ id: "ab" }));
    expect(res.status).toBe(400);
    const body = ErrorEnvelope.parse(await res.json());
    expect(body.error.code).toBe("BAD_REQUEST");
    expect(Object.keys(body.error.fields ?? {})).toEqual(["n"]);
    expect(res.headers.get("content-language")).toBe("hi");
  });

  it("bad body → 422; malformed JSON → 400", async () => {
    const post = route({ body: z.object({ name: z.string().min(1) }) }, async ({ body }) => created(body));
    const bad = await post(
      new NextRequest("http://x/t", { method: "POST", body: JSON.stringify({ name: "" }), headers: { "content-type": "application/json" } }),
      ctx(),
    );
    expect(bad.status).toBe(422);
    expect((await bad.json()).error.fields).toHaveProperty("name");

    const malformed = await post(
      new NextRequest("http://x/t", { method: "POST", body: "{nope", headers: { "content-type": "application/json" } }),
      ctx(),
    );
    expect(malformed.status).toBe(400);

    const good = await post(
      new NextRequest("http://x/t", { method: "POST", body: JSON.stringify({ name: "A" }), headers: { "content-type": "application/json" } }),
      ctx(),
    );
    expect(good.status).toBe(201);
  });

  it("thrown ApiError → its status; unknown error → 500 INTERNAL", async () => {
    const nf = route({}, async () => {
      throw new ApiError("NOT_FOUND");
    });
    expect((await nf(new NextRequest("http://x/t"), ctx())).status).toBe(404);

    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const boom = route({}, async () => {
      throw new Error("db down");
    });
    const res = await boom(new NextRequest("http://x/t"), ctx());
    expect(res.status).toBe(500);
    expect((await res.json()).error.code).toBe("INTERNAL");
    expect(res.headers.get("x-request-id")).toBeTruthy();
    spy.mockRestore();
  });
});

describe("request helpers", () => {
  it("resolves locale from ?locale= then Accept-Language", () => {
    const h = (v: string) => new Headers({ "accept-language": v });
    expect(resolveLocale(new URL("http://x/?locale=hi"), h("en"))).toBe("hi");
    expect(resolveLocale(new URL("http://x/"), h("hi-IN,hi;q=0.9,en;q=0.8"))).toBe("hi");
    expect(resolveLocale(new URL("http://x/"), h("fr;q=1, en;q=0.5, hi;q=0.7"))).toBe("hi");
    expect(resolveLocale(new URL("http://x/?locale=fr"), new Headers())).toBe("en");
  });

  it("hashes IPs with a salt and never returns the raw IP", () => {
    const a = hashIp("10.0.0.1", "s1");
    expect(a).toHaveLength(64);
    expect(a).not.toContain("10.0.0.1");
    expect(hashIp("10.0.0.1", "s2")).not.toBe(a);
    expect(hashIp(null, "s")).toBeNull();
  });

  it("rate limiter throws RATE_LIMITED with retryAfter, then resets", () => {
    let t = 0;
    const rl = new RateLimiter(2, 10_000, () => t);
    rl.hit("ip");
    rl.hit("ip");
    try {
      rl.hit("ip");
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).code).toBe("RATE_LIMITED");
      expect((e as ApiError).retryAfter).toBe(10);
    }
    rl.hit("other");
    t = 10_001;
    expect(() => rl.hit("ip")).not.toThrow();
  });
});
