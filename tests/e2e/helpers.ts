import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import AxeBuilder from "@axe-core/playwright";
import type { APIRequestContext, Browser, BrowserContext, Page } from "@playwright/test";

export const CACHE_DIR = path.join(process.cwd(), "tests", "e2e", ".cache");
export const AUTH_FILE = path.join(CACHE_DIR, "state-admin.json");
export const DATA_FILE = path.join(CACHE_DIR, "data.json");

export const DEV_PHONES = {
  samithi_coord: "+919000000001",
  district_coord: "+919000000002",
  state_admin: "+919000000003",
  content_editor: "+919000000004",
  translator: "+919000000005",
  pii_officer: "+919000000006",
} as const;
export type DevRole = keyof typeof DEV_PHONES;

/** Samples resolved by global-setup (seed tokens, slugs, ids). */
export type E2EData = {
  tokens: Record<string, string>;
  eventId: string;
  centreSlug: string;
  articleSlug: string;
  districtSlug: string;
  programType: string;
  discourseSlug?: string;
  admin?: { eventId?: string; centreId?: string; contentId?: string; inboxId?: string; formId?: string };
};
export function readData(): E2EData {
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf8")) as E2EData;
}

export const SERVER_LOG = process.env.E2E_SERVER_LOG ?? path.join(os.tmpdir(), `saidelhi-e2e-${process.env.E2E_PORT ?? 4400}.log`);

/**
 * The dev messages endpoint masks login codes (LoggedWhatsApp stores "••••••"), so the code is read from the
 * server stdout (`[whatsapp:console] to=<phone> login_code/en: Your code is 123456`). The server must tee its
 * output to SERVER_LOG (playwright.config.ts does; for an external server set E2E_SERVER_LOG).
 */
export function logOffset(): number {
  try {
    return fs.statSync(SERVER_LOG).size;
  } catch {
    return 0;
  }
}

export async function latestOtp(_request: APIRequestContext, phone: string, since = 0): Promise<string> {
  const digits = phone.replace(/\D/g, "");
  for (let i = 0; i < 40; i++) {
    try {
      const txt = fs.readFileSync(SERVER_LOG).subarray(since).toString("utf8");
      const re = new RegExp(`\\[whatsapp:console\\] to=\\+?${digits} \\S+: .*?(\\d{6})`, "g");
      let m: RegExpExecArray | null;
      let last: string | null = null;
      while ((m = re.exec(txt))) last = m[1]!;
      if (last) return last;
    } catch {
      /* log not there yet */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`no OTP for ${phone} in ${SERVER_LOG}`);
}

/** Portal login through the API (cookies land in the request context's jar, shared with the page). */
export async function apiLogin(request: APIRequestContext, role: DevRole = "state_admin"): Promise<void> {
  const phone = DEV_PHONES[role];
  const since = logOffset();
  const o = await request.post(`/api/v1/auth/otp`, { data: { phone } });
  if (!o.ok()) throw new Error(`otp ${o.status()} ${await o.text()}`);
  const code = await latestOtp(request, phone, since);
  const v = await request.post(`/api/v1/auth/verify`, { data: { phone, code } });
  if (!v.ok()) throw new Error(`verify ${v.status()} ${await v.text()}`);
}

/** Context logged in as `role` (fresh login; mind the OTP rate limit, prefer the saved state-admin file). */
export async function login(browser: Browser, role: DevRole = "state_admin"): Promise<BrowserContext> {
  const ctx = await browser.newContext();
  await apiLogin(ctx.request, role);
  return ctx;
}

/** Form-link session (`fsid` cookie) for a seed token via OTP. */
export async function formLinkLogin(request: APIRequestContext, token: string, phone = "9000000001"): Promise<void> {
  const since = logOffset();
  const o = await request.post(`/api/v1/links/${token}/otp`, { data: { phone } });
  if (!o.ok()) throw new Error(`link otp ${o.status()} ${await o.text()}`);
  const code = await latestOtp(request, phone.startsWith("+") ? phone : `+91${phone}`, since);
  const v = await request.post(`/api/v1/links/${token}/verify`, { data: { phone, code } });
  if (!v.ok()) throw new Error(`link verify ${v.status()} ${await v.text()}`);
}

export type AxeIssue = { rule: string; impact: string; selector: string; help: string; nodes: number };

export async function axeCheck(page: Page, opts: { exclude?: string[] } = {}): Promise<AxeIssue[]> {
  let b = new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).exclude("nextjs-portal");
  for (const e of opts.exclude ?? []) b = b.exclude(e);
  const r = await b.analyze();
  return r.violations.map((v) => ({
    rule: v.id,
    impact: v.impact ?? "minor",
    selector: v.nodes[0]?.target.join(" ") ?? "",
    help: v.help,
    nodes: v.nodes.length,
  }));
}

export async function noHorizontalOverflow(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const de = document.documentElement;
    const over = de.scrollWidth - window.innerWidth;
    if (over <= 1) return null;
    let culprit = "";
    for (const el of Array.from(document.body.querySelectorAll("*"))) {
      const r = el.getBoundingClientRect();
      if (r.right > window.innerWidth + 1 && r.width > 0) {
        const cls = typeof el.className === "string" && el.className ? "." + el.className.split(" ")[0] : "";
        culprit = `${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}${cls}`;
        break;
      }
    }
    return `scrollWidth ${de.scrollWidth} > ${window.innerWidth} (first offender ${culprit || "?"})`;
  });
}
