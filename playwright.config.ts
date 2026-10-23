import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 4400);
const PERF = process.env.E2E_PERF === "1";
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

/**
 * Journeys + a11y run against `next dev` (dev-only WhatsApp endpoints needed for OTP).
 * Perf (`E2E_PERF=1`) runs against `next start` (run `pnpm build` first).
 * Set E2E_BASE_URL to reuse an already running server.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/*.spec.ts",
  globalSetup: "./tests/e2e/global-setup.ts",
  outputDir: "./test-results",
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  use: { baseURL, trace: "off", screenshot: "off", locale: "en-IN" },
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `mkdir -p tests/e2e/.cache && ${PERF ? "pnpm start" : "pnpm dev"} --port ${PORT} 2>&1 | tee tests/e2e/.cache/server.log`,
        url: `${baseURL}/api/v1/health`,
        reuseExistingServer: true,
        timeout: 180_000,
        env: { DATA_SOURCE: "db", WHATSAPP_PROVIDER: "console" },
      },
  projects: PERF
    ? [{ name: "perf", testMatch: "**/perf.spec.ts", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } }]
    : [
        { name: "chromium-desktop", testIgnore: "**/perf.spec.ts", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } },
        { name: "mobile", testIgnore: "**/perf.spec.ts", use: { ...devices["Desktop Chrome"], viewport: { width: 375, height: 812 }, hasTouch: true } },
      ],
});
