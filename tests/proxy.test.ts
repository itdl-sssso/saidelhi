import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";
import { PORTAL_COOKIES } from "@/contract/auth";

const events = { exists: vi.fn(async () => false) };
vi.mock("@/server/services", () => ({ services: () => ({ events }) }));

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
});
