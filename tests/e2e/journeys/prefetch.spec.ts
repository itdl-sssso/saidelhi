import { expect, test } from "@playwright/test";
import { AUTH_FILE } from "../helpers";

/**
 * Regression: on a portal URL with a query string the page used to fire a same-path prefetch without the query
 * (`/en/admin/x?_rsc`, 307 -> 307 -> postponed 200) whose body never completed (~30s abort), so `networkidle`
 * waited 30s. No request on a queried portal URL may stay pending, and the page must go idle quickly.
 */
test.describe("portal prefetch", () => {
  test.use({ storageState: AUTH_FILE });

  for (const url of ["/admin/migration?tab=redirects", "/admin/centres?x=1", "/admin/people?tab=x", "/hi/admin/migration?tab=redirects"]) {
    test(`no hung request on ${url}`, async ({ page }) => {
      const open = new Map<object, { url: string; t: number }>();
      page.on("request", (r) => open.set(r, { url: r.url(), t: Date.now() }));
      page.on("requestfinished", (r) => open.delete(r));
      page.on("requestfailed", (r) => open.delete(r));
      const redirects: string[] = [];
      page.on("response", (r) => {
        if (r.status() >= 300 && r.status() < 400 && r.url().includes("_rsc=")) redirects.push(`${r.status()} ${r.url()}`);
      });
      await page.goto(url);
      const t0 = Date.now();
      await page.waitForLoadState("networkidle", { timeout: 8_000 });
      expect(Date.now() - t0, "networkidle").toBeLessThan(5_000);
      await page.waitForTimeout(1_000);
      const pending = [...open.values()].filter((o) => Date.now() - o.t > 5_000 && !o.url.includes("/_next/webpack-hmr"));
      expect(pending, "requests pending > 5s").toEqual([]);
      expect(redirects, "RSC prefetches must not redirect").toEqual([]);
    });
  }
});
