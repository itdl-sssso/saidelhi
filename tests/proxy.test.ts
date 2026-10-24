import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";
import { PORTAL_COOKIES } from "@/contract/auth";

const events = { exists: vi.fn(async () => false) };
const districts = { units: vi.fn(async () => [{ slug: "east" }]) };
const redirects = {
  resolve: vi.fn(async (p: string) => (p.endsWith("/districts/south") ? { to: "/impact", permanent: true } : null)),
};
vi.mock("@/server/services", () => ({ services: () => ({ events, districts, redirects }) }));

vi.mock("next-intl/middleware", () => ({ default: () => () => new Response(null, { status: 200 }) }));
vi.mock("@/i18n/routing", () => ({ routing: {} }));

import proxy from "@/proxy";

const get = (path: string) => proxy(new NextRequest(`http://x${path}`, { headers: { cookie: `${PORTAL_COOKIES.session}=s` } }));
const rewrittenToNotFound = (r: Response) => (r.headers.get("x-middleware-rewrite") ?? "").includes("__not-found");

describe("proxy existence probe", () => {
  it("does not probe /admin/events/new as an event id", async () => {
    events.exists.mockClear();
    const r = await get("/admin/events/new");
    expect(rewrittenToNotFound(r)).toBe(false);
    expect(events.exists).not.toHaveBeenCalled();
  });
  it("still 404-rewrites unknown admin event ids", async () => {
    const r = await get("/admin/events/nope");
    expect(rewrittenToNotFound(r)).toBe(true);
  });
  it("redirects a retired district slug via the redirect table before 404", async () => {
    for (const [path, to] of [["/districts/south", "http://x/impact"], ["/hi/districts/south", "http://x/impact"]]) {
      const r = await get(path);
      expect(r.status).toBe(301);
      expect(r.headers.get("location")).toBe(to);
    }
  });
  it("still 404s a district slug with no redirect rule", async () => {
    const r = await get("/districts/atlantis");
    expect(rewrittenToNotFound(r)).toBe(true);
  });
  it("301s /admin/volunteers to /admin/sevadal incl. /hi, subpath and query", async () => {
    const r = await get("/hi/admin/volunteers/abc?page=2");
    expect(r.status).toBe(301);
    expect(r.headers.get("location")).toBe("http://x/hi/admin/sevadal/abc?page=2");
  });
});
