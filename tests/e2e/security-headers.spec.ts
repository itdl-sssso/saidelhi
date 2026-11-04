import { expect, test } from "@playwright/test";

test.describe("security headers", () => {
  test("home sets CSP frame-ancestors and hides x-powered-by", async ({ request }) => {
    const res = await request.get("/");
    const headers = res.headers();
    expect(headers["content-security-policy"]).toContain("frame-ancestors 'self'");
    expect(headers["x-frame-options"]).toBe("SAMEORIGIN");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-powered-by"]).toBeUndefined();
  });
});
