import fs from "node:fs";
import { test } from "@playwright/test";
import { AUTH_FILE } from "../helpers";

test.use({ storageState: AUTH_FILE });
test("probe", async ({ page }) => {
  await page.goto("/admin/discourses/01M5MY0BBFHNHJ0HRBD0PDTK40");
  await page.waitForLoadState("networkidle");
  const snap = (await page.locator("main").ariaSnapshot()).split("\n").filter((l) => /button|heading|textbox|combobox|status|alert|tab|region|group/.test(l)).slice(0, 70).join("\n");
  fs.writeFileSync("/tmp/claude-1000/-home-sam-Claude-next-saidelhi/ef211e55-b595-48c7-a136-5830ff6330f4/scratchpad/probe2.txt", snap);
});
