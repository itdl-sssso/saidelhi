import ExcelJS from "exceljs";
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

  test("upload wizard: seva type, template, file, check rows, load", async ({ page }) => {
    // Build the upload from the real template (header row 1, one data row).
    const tpl = await page.request.get("/api/v1/admin/uploads/template.xlsx?sevaType=eye");
    expect(tpl.status()).toBe(200);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load((await tpl.body()) as unknown as ArrayBuffer);
    const ws = wb.getWorksheet("Report")!;
    const header = (ws.getRow(1).values as (string | undefined)[]).map((v) => v ?? "");
    const row = ws.getRow(2);
    const set = (key: string, v: string | number) => (row.getCell(header.indexOf(key)).value = v);
    set("samithi_code", "S-KAROL");
    set("date", "12/10/2026");
    set("venue", `E2E upload hall ${stamp}`);
    set("volunteers", 10);
    set("volunteer_hours", 40);
    set("registered", 100);
    set("male", 40);
    set("female", 60);
    set("spectacles_total", 20);
    set("p_1_0", 20);
    set("cataract_found", 5);
    row.commit();
    const buffer = Buffer.from(await wb.xlsx.writeBuffer());

    await page.goto("/admin/uploads/new");
    await page.waitForLoadState("networkidle");
    await page.getByRole("combobox", { name: "What kind of seva is in this sheet?" }).selectOption({ label: "Eye camp" });
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.getByRole("button", { name: "I already have the file" }).click(); // the template itself is fetched above
    await page.locator("input[type=file]").setInputFiles({ name: "e2e-upload.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer });
    await expect(page.getByText("1 row OK")).toBeVisible({ timeout: 20_000 });
    await page.getByRole("button", { name: "Load 1 row" }).click();
    await expect(page.getByRole("button", { name: "Load 1 row" })).toHaveCount(0, { timeout: 20_000 });
    await page.goto("/admin/uploads");
    await expect(page.getByText("e2e-upload.xlsx").first()).toBeVisible();
  });

  test("content: create an article, publish it, see it on /news", async ({ page }) => {
    const title = `E2E article ${stamp}`;
    await page.goto("/admin/content");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "New", exact: true }).click();
    const dlg = page.getByRole("dialog");
    await dlg.getByRole("combobox").first().selectOption("news");
    await dlg.getByRole("textbox").first().fill(title);
    await dlg.getByRole("button", { name: "Create" }).click();
    await expect(page).toHaveURL(/\/admin\/content\/[^/]+$/, { timeout: 15_000 });
    await page.waitForLoadState("networkidle");
    // Both languages are needed before publishing.
    const hindi = page.getByRole("textbox", { name: /हिंदी|Hindi/ }).first();
    if (await hindi.isVisible().catch(() => false)) await hindi.fill(`ई२ई लेख ${stamp}`);
    const body = page.locator("[contenteditable=true]").first();
    await body.click();
    await page.keyboard.type("Body written by the e2e journey.");
    await page.getByRole("button", { name: /^Publish/ }).first().click();
    const confirm = page.getByRole("dialog").getByRole("button", { name: /^Publish/ });
    if (await confirm.isVisible().catch(() => false)) await confirm.click();
    // Public list picks it up (cache tags revalidate on publish).
    await expect.poll(async () => (await page.request.get("/news")).status()).toBe(200);
    await page.goto("/news");
    await expect(page.getByText(title).first()).toBeVisible({ timeout: 15_000 });
  });

  test("redirect: add a legacy redirect, public URL answers 301", async ({ page, playwright, baseURL }) => {
    const from = `/content/e2e-moved-${stamp}`;
    await page.goto("/admin/migration?tab=redirects");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "Add redirect" }).click();
    const dlg = page.getByRole("dialog");
    await dlg.getByRole("textbox", { name: "Old address" }).fill(from);
    await dlg.getByRole("textbox", { name: "New address" }).fill("/about");
    await dlg.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText(from)).toBeVisible({ timeout: 15_000 });
    const anon = await playwright.request.newContext({ baseURL });
    // Redirect lookups are cached for up to 5 minutes, but this path was never looked up before.
    const res = await anon.get(from, { maxRedirects: 0 });
    expect(res.status()).toBe(301);
    expect(res.headers()["location"]).toMatch(/\/about$/);
    await anon.dispose();
  });
});
