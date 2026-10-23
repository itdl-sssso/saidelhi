import { expect, test } from "@playwright/test";
import { AUTH_FILE, DEV_PHONES, latestOtp, logOffset, readData } from "../helpers";


const stamp = Date.now().toString(36);

test.describe("portal login", () => {
  test("OTP login through the UI lands on the overview, logout returns to login", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login\?next=/);
    const phone = DEV_PHONES.content_editor; // not the state admin: its OTP budget is used by global-setup
    await page.getByRole("textbox", { name: /phone|number/i }).fill(phone.replace("+91", ""));
    const since = logOffset();
    await page.getByRole("button", { name: "Send code on WhatsApp" }).click();
    const code = await latestOtp(page.request, phone, since);
    await page.locator("input[autocomplete=one-time-code], input[inputmode=numeric]").first().fill(code);
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.locator("main h1").first()).toBeVisible();
  });
});

test.describe("portal work", () => {
  test.use({ storageState: AUTH_FILE });

  test("coordinator plans an event, state admin approves it in Approvals", async ({ browser, baseURL }) => {
    const title = `E2E Eye camp ${stamp}`;
    // A samithi coordinator (dev phone ...08): a state admin's own plans are auto-approved.
    const coord = await browser.newContext({ baseURL, storageState: { cookies: [], origins: [] } });
    const cp = "+919000000008";
    const since = logOffset();
    expect((await coord.request.post("/api/v1/auth/otp", { data: { phone: cp } })).ok()).toBe(true);
    const code = await latestOtp(coord.request, cp, since);
    expect((await coord.request.post("/api/v1/auth/verify", { data: { phone: cp, code } })).ok()).toBe(true);
    const page = await coord.newPage();
    await page.goto("/admin/events/new"); // regression: proxy used to 404 this ("new" probed as an event id)
    await expect(page.getByRole("heading", { name: "Plan an event" })).toBeVisible();
    await page.waitForLoadState("networkidle");
    await page.getByRole("textbox", { name: "Title", exact: true }).fill(title);
    await page.getByRole("textbox", { name: "Date", exact: true }).fill("2026-12-20");
    await page.getByRole("textbox", { name: "Venue", exact: true }).fill("E2E Community Hall");
    await page.getByRole("textbox", { name: "English", exact: true }).fill("Free eye screening for the neighbourhood.");
    await page.getByRole("textbox", { name: "हिंदी", exact: true }).fill("पड़ोस के लिए निःशुल्क नेत्र जाँच।");
    await page.getByRole("button", { name: "Submit for approval" }).click();
    await expect(page).toHaveURL(/\/admin\/events\/[^/]+$/);
    await expect(page.getByRole("heading", { name: title }).first()).toBeVisible();

    await coord.close();

    const admin = await browser.newContext({ baseURL, storageState: AUTH_FILE });
    const ap = await admin.newPage();
    await ap.goto("/admin/approvals");
    const mine = () => ap.locator("article", { has: ap.getByRole("link", { name: new RegExp(title) }) });
    await expect(mine()).toBeVisible();
    await mine().getByRole("button", { name: "Approve", exact: true }).click();
    // Approved plans leave the queue.
    await expect(mine()).toHaveCount(0, { timeout: 15_000 });
    await admin.close();
  });

  test("review inbox: approve a drafted WhatsApp report into its event", async ({ page }) => {
    await page.goto("/admin/inbox/01JCSEEDIBX000000000000001");
    await expect(page.getByRole("heading", { level: 1, name: /WhatsApp report/ })).toBeVisible();
    await page.waitForLoadState("networkidle");
    // The rules draft leaves the by-power split empty; it must add up to the total (96).
    await page.getByRole("textbox", { name: "+1.0 (optional)" }).fill("96");
    await page.locator("#f-volunteers").fill("12");
    await page.locator("#f-volunteer_hours").fill("48");
    // Fields the extractor was unsure about ("Check this field") are confirmed by re-entering them.
    await page.locator("#f-male").fill("61");
    await page.locator("#f-male").fill("60");
    await page.locator("#f-female").fill("83");
    await page.locator("#f-female").fill("82");
    await page.getByRole("button", { name: "Approve into event" }).click();
    // Back on the list, the item has left "For me".
    await expect(page).toHaveURL(/\/admin\/inbox(\?.*)?$/, { timeout: 15_000 });
    await expect(page.locator('a[href="/admin/inbox/01JCSEEDIBX000000000000001"]')).toHaveCount(0);
  });
});

void readData;
