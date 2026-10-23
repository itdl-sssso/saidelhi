import fs from "node:fs";
import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import { AUTH_FILE, CACHE_DIR, axeCheck, formLinkLogin, noHorizontalOverflow, readData } from "./helpers";
import { KNOWN } from "./known";
import { adminRoutes, formRoutes, publicRoutes } from "./routes";

/**
 * Audit: axe (wcag2a/aa), html[lang], one h1, skip link, visible focus (first 10 tabbables), img alt,
 * console errors, no horizontal overflow at 375.
 * `E2E_COLLECT=1`: record every issue to `.cache/issues.jsonl` and never fail (feeds docs/progress/M7-a11y-findings.md).
 * Normal mode: issues listed in `known.ts` (finding ids) are tolerated; anything else fails.
 */

const COLLECT = process.env.E2E_COLLECT === "1";
const data = readData();

type Issue = { check: string; rule: string; impact: string; detail: string; selector?: string; nodes?: number };

const IGNORED_CONSOLE = [/React DevTools/i, /Download the React/i, /\[HMR\]|\[Fast Refresh\]/i, /favicon/i, /Failed to load resource.*(tile|openstreetmap|googleapis|gstatic)/i];

async function audit(page: Page, path: string, locale: "en" | "hi", mobile: boolean): Promise<Issue[]> {
  const issues: Issue[] = [];
  const add = (check: string, rule: string, impact: string, detail: string, selector?: string, nodes?: number) =>
    issues.push({ check, rule, impact, detail, selector, nodes });

  const consoleErrs: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error" && !IGNORED_CONSOLE.some((r) => r.test(m.text()))) consoleErrs.push(m.text().slice(0, 200));
  });
  page.on("pageerror", (e) => consoleErrs.push(`pageerror: ${e.message.slice(0, 200)}`));

  const url = (locale === "hi" ? "/hi" : "") + (path === "/" && locale === "hi" ? "" : path);
  const res = await page.goto(url, { waitUntil: "load" });
  await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(400);
  if (!res || res.status() >= 400) add("status", "http-status", "serious", `HTTP ${res?.status()}`);

  // html[lang]
  const lang = await page.evaluate(() => document.documentElement.lang);
  if (lang !== locale) add("lang", "html-lang", "serious", `html[lang]="${lang}", expected "${locale}"`);

  // one h1
  const h1 = await page.locator("h1:visible").count();
  if (h1 !== 1) add("h1", "single-h1", "moderate", `${h1} visible h1 elements`);

  // img alt
  const noAlt = await page.evaluate(() => Array.from(document.images).filter((i) => !i.hasAttribute("alt")).map((i) => i.currentSrc || i.src).slice(0, 3));
  if (noAlt.length) add("alt", "img-alt-attr", "serious", `img without alt attr: ${noAlt.join(", ")}`);

  // skip link: first Tab lands on an in-page anchor
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.keyboard.press("Tab");
  const first = await page.evaluate(() => {
    const a = document.activeElement as HTMLAnchorElement | null;
    return a ? { tag: a.tagName, href: a.getAttribute("href") ?? "", text: (a.textContent ?? "").trim().slice(0, 40) } : null;
  });
  if (!first || first.tag !== "A" || !first.href.startsWith("#")) add("skip", "skip-link", "moderate", `first Tab focus: ${first ? `${first.tag} href="${first.href}" "${first.text}"` : "none"}`);

  // visible focus on first 10 tabbables (first already focused)
  const bad: string[] = [];
  for (let i = 0; i < 10; i++) {
    const r = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return null;
      const cs = getComputedStyle(el);
      const outline = cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0 && cs.outlineColor !== "rgba(0, 0, 0, 0)";
      const shadow = cs.boxShadow !== "none";
      const rect = el.getBoundingClientRect();
      const label = `${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}[${(el.getAttribute("aria-label") ?? el.textContent ?? "").trim().slice(0, 24)}]`;
      return { ok: outline || shadow, label, visible: rect.width > 0 && rect.height > 0 };
    });
    if (r && r.visible && !r.ok) bad.push(r.label);
    await page.keyboard.press("Tab");
  }
  if (bad.length) add("focus", "focus-visible", "serious", `no visible focus style: ${bad.join(" | ")}`);

  // overflow at 375
  if (mobile) {
    const o = await noHorizontalOverflow(page);
    if (o) add("overflow", "overflow-x", "serious", o);
  }

  // axe
  for (const v of await axeCheck(page)) add("axe", v.rule, v.impact, v.help, v.selector, v.nodes);

  if (consoleErrs.length) add("console", "console-error", "moderate", [...new Set(consoleErrs)].slice(0, 3).join(" || "));
  return issues;
}

function record(project: string, locale: string, path: string, issues: Issue[]) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const lines = issues.map((i) => JSON.stringify({ project, locale, path, ...i })).join("\n");
  if (lines) fs.appendFileSync(`${CACHE_DIR}/issues.jsonl`, lines + "\n");
}

async function run(page: Page, project: string, path: string, locale: "en" | "hi") {
  const mobile = project === "mobile";
  const issues = await audit(page, path, locale, mobile);
  if (COLLECT) {
    record(project, locale, path, issues);
    return;
  }
  const known = KNOWN[path] ?? {};
  const fresh = issues.filter((i) => !known[`${i.check}:${i.rule}`]);
  const tolerated = issues.filter((i) => known[`${i.check}:${i.rule}`]);
  if (tolerated.length) test.info().annotations.push({ type: "known-findings", description: [...new Set(tolerated.map((i) => known[`${i.check}:${i.rule}`]))].join(", ") });
  expect(fresh, fresh.map((i) => `${i.check}:${i.rule} ${i.detail} ${i.selector ?? ""}`).join("\n")).toEqual([]);
}

for (const locale of ["en", "hi"] as const) {
  test.describe(`public ${locale}`, () => {
    for (const r of publicRoutes(data)) {
      test(`${locale} ${r.path}`, async ({ page }, ti) => {
        await run(page, ti.project.name, r.path, locale);
      });
    }
  });

  test.describe(`admin ${locale}`, () => {
    test.use({ storageState: AUTH_FILE });
    for (const r of adminRoutes(data)) {
      test(`${locale} ${r.path}`, async ({ page }, ti) => {
        await run(page, ti.project.name, r.path, locale);
      });
    }
  });
}

test.describe("admin login (signed out)", () => {
  for (const locale of ["en", "hi"] as const) {
    test(`${locale} /admin/login`, async ({ page }, ti) => {
      await run(page, ti.project.name, "/admin/login", locale);
    });
  }
});

test.describe("form links /f", () => {
  let ctx: BrowserContext;
  test.beforeAll(async ({ browser }) => {
    ctx = await browser.newContext();
    await formLinkLogin(ctx.request, data.tokens["eye-report"]!);
  });
  test.afterAll(async () => ctx?.close());
  for (const locale of ["en", "hi"] as const) {
    for (const r of formRoutes(data)) {
      test(`${locale} form ${r.key}`, async ({ browser, baseURL }, ti) => {
        // Reuse the session cookies in a context carrying this project's viewport.
        const c = await browser.newContext({ ...ti.project.use, storageState: r.needsSession ? await ctx.storageState() : undefined, baseURL });
        const page = await c.newPage();
        try {
          await run(page, ti.project.name, r.path, locale);
        } finally {
          await c.close();
        }
      });
    }
  }
});

test.describe("page-level sanity", () => {
  test("known.ts has no stale route keys", () => {
    const all = new Set([...publicRoutes(data), ...adminRoutes(data)].map((r) => r.path).concat(formRoutes(data).map((r) => r.path), ["/admin/login"]));
    expect(Object.keys(KNOWN).filter((k) => !all.has(k))).toEqual([]);
  });
});
