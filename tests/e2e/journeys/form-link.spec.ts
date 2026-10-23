import { expect, test, type Page } from "@playwright/test";
import { latestOtp, logOffset, readData } from "../helpers";

const PHONE = "9000000001";

/** Separate links per project: a submitted report can't be submitted twice, and OTP resend is throttled per link. */
const TOKEN_KEYS = {
  "chromium-desktop": { report: "eye-report", draft: "eye-desk-1" },
  mobile: { report: "blood-report", draft: "eye-desk-1" },
} as const;
const keys = (name: string) => TOKEN_KEYS[name as keyof typeof TOKEN_KEYS] ?? TOKEN_KEYS["chromium-desktop"];

/** OTP verify on the link page (phone -> code). */
async function verify(page: Page, token: string) {
  await page.goto(`/f/${token}`);
  const phone = page.getByRole("textbox", { name: "Your phone number" });
  await expect(phone).toBeVisible();
  await page.waitForLoadState("networkidle");
  await phone.fill(PHONE);
  const since = logOffset();
  await page.getByRole("button", { name: "Send code on WhatsApp" }).click();
  const code = await latestOtp(page.request, `+91${PHONE}`, since);
  const first = page.locator("input[autocomplete=one-time-code], input[inputmode=numeric]").first();
  await expect(first).toBeVisible();
  await first.fill(code); // a full code in one box = autofill/paste, completes + verifies
  await expect(page).toHaveURL(new RegExp(`/f/${token}/form`));
}

/** Fill every empty, editable field on the current step with a safe value. */
async function fillStep(page: Page) {
  const inputs = page.locator("main input:visible:not([readonly]):not([disabled])");
  const n = await inputs.count();
  for (let i = 0; i < n; i++) {
    const el = inputs.nth(i);
    const type = (await el.getAttribute("type")) ?? "text";
    if (type === "file" || type === "checkbox" || type === "radio" || type === "hidden") continue;
    if ((await el.inputValue()) !== "") continue;
    if (type === "number" || (await el.getAttribute("inputmode")) === "numeric") await el.fill("0");
    else await el.fill("Test");
  }
}

test("form link: OTP verify -> fill -> submit -> done -> reopen", async ({ page }, ti) => {
  const token = readData().tokens[keys(ti.project.name).report]!;
  await verify(page, token);

  await expect(page.getByRole("button", { name: /^(Next|Send report)/ }).first()).toBeVisible();
  for (let guard = 0; guard < 12; guard++) {
    await page.waitForLoadState("networkidle");
    // Registered count is locked on some forms; fill what is editable.
    await fillStep(page);
    const send = page.getByRole("button", { name: "Send report" });
    if (await send.isVisible().catch(() => false)) break;
    await page.getByRole("button", { name: "Next", exact: true }).click();
  }
  await page.getByRole("button", { name: "Send report" }).click();
  await expect(page.getByText(/sent|thank/i).first()).toBeVisible();

  // Reopen the link: session is kept, the form shows the sent state (view done).
  await page.goto(`/f/${token}/done`);
  await expect(page.locator("main h1").first()).toBeVisible();
});

test("form link: expired link shows the closed page", async ({ page }) => {
  const errors: string[] = [];
  // The token probe answers 410 Gone; Chrome logs it as a console error. Expected here.
  page.on("console", (m) => {
    if (m.type() === "error" && !/410/.test(m.text())) errors.push(m.text());
  });
  await page.goto(`/f/${readData().tokens["eye-expired"]!}`);
  await expect(page.getByRole("heading", { name: "This link has closed" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("form link: revoked link shows inactive page", async ({ page }) => {
  await page.goto(`/f/${readData().tokens["eye-revoked"]!}`);
  await expect(page.getByRole("heading", { name: "This link is no longer active" })).toBeVisible();
});

test("form link: offline draft survives reload", async ({ page, context }, ti) => {
  test.skip(ti.project.name === "mobile", "desktop only: same link, OTP resend throttle");
  const token = readData().tokens[keys(ti.project.name).draft]!;
  await verify(page, token);
  await page.waitForLoadState("networkidle");
  const field = page.getByRole("textbox", { name: "Volunteers (sevadals)" });
  await expect(field).toBeVisible();
  await context.setOffline(true);
  await field.fill("7");
  await field.blur();
  await page.waitForTimeout(800);
  await context.setOffline(false);
  await page.reload();
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("textbox", { name: "Volunteers (sevadals)" })).toHaveValue("7");
});
