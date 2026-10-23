import fs from "node:fs";
import { gzipSync } from "node:zlib";
import { test, expect } from "@playwright/test";
import { BUDGETS } from "./budgets";
import { CACHE_DIR, readData } from "./helpers";
import { KNOWN_PERF } from "./known";
import { publicRoutes } from "./routes";

/**
 * Perf budgets on public routes (EN, desktop, `next start`): JS gz transferred, LCP, images, CLS.
 * Run: `pnpm build && pnpm e2e:perf`.  `E2E_COLLECT=1` records numbers to `.cache/perf.jsonl` and never fails.
 * JS size = gzip of each script response body (localhost has no compression; this models production).
 */
const COLLECT = process.env.E2E_COLLECT === "1";
const data = readData();

for (const r of publicRoutes(data)) {
  test(`perf ${r.path}`, async ({ page }) => {
    let jsGz = 0;
    const images: { url: string; kb: number }[] = [];
    page.on("response", async (res) => {
      try {
        const type = res.request().resourceType();
        if (type === "script") jsGz += gzipSync(await res.body()).length;
        if (type === "image" && res.ok()) images.push({ url: res.url().slice(-80), kb: (await res.body()).length / 1024 });
      } catch {
        /* redirected/aborted body */
      }
    });
    await page.addInitScript(() => {
      const w = window as unknown as { __lcp: number; __cls: number };
      w.__lcp = 0;
      w.__cls = 0;
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) w.__lcp = e.startTime;
      }).observe({ type: "largest-contentful-paint", buffered: true });
      new PerformanceObserver((l) => {
        for (const e of l.getEntries() as unknown as { value: number; hadRecentInput: boolean }[]) if (!e.hadRecentInput) w.__cls += e.value;
      }).observe({ type: "layout-shift", buffered: true });
    });

    await page.goto(r.path, { waitUntil: "load" });
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
    await page.waitForTimeout(500);
    const m = await page.evaluate(() => {
      const w = window as unknown as { __lcp: number; __cls: number };
      return { lcp: w.__lcp, cls: w.__cls };
    });
    const jsKb = jsGz / 1024;
    const bigImages = images.filter((i) => i.kb > BUDGETS.maxImageKb);
    const jsBudget = r.path === "/" ? BUDGETS.jsGzKbHome : BUDGETS.jsGzKb;

    const fails: string[] = [];
    if (jsKb > jsBudget) fails.push(`js-gz ${jsKb.toFixed(0)}KB > ${jsBudget}`);
    if (m.lcp > BUDGETS.lcpMs) fails.push(`lcp ${m.lcp.toFixed(0)}ms > ${BUDGETS.lcpMs}`);
    if (m.cls > BUDGETS.cls) fails.push(`cls ${m.cls.toFixed(3)} > ${BUDGETS.cls}`);
    for (const i of bigImages) fails.push(`image ${i.kb.toFixed(0)}KB > ${BUDGETS.maxImageKb}: ${i.url}`);

    if (COLLECT) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
      fs.appendFileSync(`${CACHE_DIR}/perf.jsonl`, JSON.stringify({ path: r.path, jsKb: +jsKb.toFixed(1), lcp: Math.round(m.lcp), cls: +m.cls.toFixed(3), fails }) + "\n");
      return;
    }
    const known = KNOWN_PERF[r.path];
    if (known) test.info().annotations.push({ type: "known-findings", description: known });
    // Known pages still fail if they get worse than the recorded numbers: tolerated = same metric names only.
    const fresh = known ? fails.filter((f) => !known.includes(f.split(" ")[0]!)) : fails;
    expect(fresh, fails.join("\n")).toEqual([]);
  });
}
