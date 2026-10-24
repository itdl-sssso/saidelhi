import { expect, test, type Page } from "@playwright/test";
import { readData } from "../helpers";

const DEVANAGARI = /[ऀ-ॿ]/;

async function noServerError(page: Page, path: string) {
  const res = await page.goto(path);
  expect(res?.status(), path).toBeLessThan(400);
  await expect(page.locator("main h1").first()).toBeVisible();
}

for (const prefix of ["", "/hi"]) {
  const hi = prefix === "/hi";
  test.describe(`public journey ${hi ? "/hi" : "EN"}`, () => {
    test("home -> calendar -> event detail", async ({ page }) => {
      const d = readData();
      await page.goto(`${prefix}/`);
      await expect(page.locator("html")).toHaveAttribute("lang", hi ? "hi" : "en");
      await expect(page.locator("h1").first()).toBeVisible();
      if (hi) await expect(page.locator("h1").first()).toHaveText(DEVANAGARI);

      // Calendar via the home page link (works at 375px too, no hamburger needed).
      await page.locator(`main a[href="${prefix}/calendar"]`).first().click();
      await expect(page).toHaveURL(new RegExp(`${prefix}/calendar$`));
      await expect(page.locator("main h1").first()).toBeVisible();

      // Event row -> detail.
      const row = page.locator(`main a[href="${prefix}/events/${d.eventId}"]`).first();
      await expect(row).toBeVisible();
      await row.click();
      await expect(page).toHaveURL(new RegExp(`/events/${d.eventId}$`));
      await expect(page.locator("main h1").first()).toBeVisible();
      if (hi) await expect(page.locator("html")).toHaveAttribute("lang", "hi");
    });

    test("values, news, article, discourses", async ({ page }) => {
      const d = readData();
      await noServerError(page, `${prefix}/values/shanti`);
      await noServerError(page, `${prefix}/news`);
      const art = page.locator(`main a[href="${prefix}/news/${d.articleSlug}"]`).first();
      if (await art.count()) {
        await art.click();
        await expect(page).toHaveURL(new RegExp(`/news/${d.articleSlug}$`));
        await expect(page.locator("main h1").first()).toBeVisible();
      } else {
        await noServerError(page, `${prefix}/news/${d.articleSlug}`);
      }
      // discourses flag is on in dev seed
      await noServerError(page, `${prefix}/discourses`);
      if (d.discourseSlug) {
        const link = page.locator(`main a[href="${prefix}/discourses/${d.discourseSlug}"]`).first();
        if (await link.count()) await link.click();
        else await page.goto(`${prefix}/discourses/${d.discourseSlug}`);
        await expect(page.locator("main h1").first()).toBeVisible();
      }
    });
  });
}

// Production serves the catch-all as a PPR shell; the proxy must still answer a real 404 (status + UI).
for (const path of [
  "/events/does-not-exist",
  "/districts/atlantis",
  "/centres/zzz",
  "/news/zzz",
  "/hi/events/does-not-exist",
  "/hi/districts/atlantis",
  "/hi/centres/zzz",
  "/hi/news/zzz",
]) {
  test(`unknown detail ${path} is a real 404`, async ({ page }) => {
    const res = await page.goto(path);
    expect(res?.status()).toBe(404);
    await expect(page.locator("main h1").first()).toBeVisible();
  });
}

test("join opt-in form validates", async ({ page }) => {
  await page.goto("/join");
  const phone = page.getByRole("textbox", { name: "WhatsApp number" });
  await expect(phone).toBeVisible();
  await page.waitForLoadState("networkidle");
  await phone.fill("123");
  await page.getByRole("button", { name: "Send me a confirmation" }).click();
  await expect(page.locator("[role=alert], [aria-invalid=true]").first()).toBeVisible();
});
