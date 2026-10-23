import { execSync } from "node:child_process";
import fs from "node:fs";
import { request as pwRequest, type FullConfig } from "@playwright/test";
import { apiLogin, AUTH_FILE, CACHE_DIR, DATA_FILE, type E2EData } from "./helpers";

type Json = { data: unknown };

async function firstId(api: Awaited<ReturnType<typeof pwRequest.newContext>>, url: string, key = "id"): Promise<string | undefined> {
  const r = await api.get(url);
  if (!r.ok()) return undefined;
  const body = ((await r.json()) as Json).data as unknown;
  const rows = Array.isArray(body) ? body : ((body as { items?: unknown[] })?.items ?? []);
  const first = rows[0] as Record<string, unknown> | undefined;
  return first && typeof first[key] === "string" ? (first[key] as string) : undefined;
}

export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]!.use.baseURL!;
  const perf = process.env.E2E_PERF === "1";
  fs.mkdirSync(CACHE_DIR, { recursive: true });

  // Reset DB to a clean seed (tokens are printed by the seed script).
  let tokens: Record<string, string> = {};
  const tokensFile = `${CACHE_DIR}/tokens.json`;
  if (!process.env.E2E_SKIP_SEED || !fs.existsSync(tokensFile)) {
    const out = execSync("pnpm db:seed", { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] });
    for (const m of out.matchAll(/^\s{2}([\w-]+)\s+(?:report|desk|public)\s+\S*\/f\/([\w-]+)\s*$/gm)) tokens[m[1]!] = m[2]!;
    fs.writeFileSync(tokensFile, JSON.stringify(tokens));
  } else {
    tokens = JSON.parse(fs.readFileSync(tokensFile, "utf8")) as Record<string, string>;
  }
  if (!tokens["eye-report"]) throw new Error("seed output: no eye-report token found");

  const api = await pwRequest.newContext({ baseURL });
  const first = async (url: string, key = "id") => firstId(api, url, key);
  const data: E2EData = {
    tokens,
    eventId: (await first("/api/v1/events"))!,
    centreSlug: (await first("/api/v1/centres", "slug"))!,
    articleSlug: (await first("/api/v1/articles", "slug"))!,
    districtSlug: await districtSlug(api),
    programType: (await first("/api/v1/programs", "sevaType"))!,
  };
  for (const [k, v] of Object.entries(data)) if (!v) throw new Error(`global-setup: missing sample ${k}`);

  if (!perf) {
    // State admin session saved for all admin specs (one OTP, avoids the rate limit).
    await apiLogin(api, "state_admin");
    await api.storageState({ path: AUTH_FILE });
    data.admin = {
      eventId: await first("/api/v1/admin/events"),
      centreId: await first("/api/v1/admin/centres"),
      contentId: await first("/api/v1/admin/content"),
      inboxId: await first("/api/v1/admin/inbox"),
      formId: await first("/api/v1/admin/forms"),
    };
  }
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  await api.dispose();
}

async function districtSlug(api: Awaited<ReturnType<typeof pwRequest.newContext>>): Promise<string> {
  const r = await api.get("/api/v1/districts");
  const rows = ((await r.json()) as { data: { district: { slug: string } }[] }).data;
  return rows[0]!.district.slug;
}
