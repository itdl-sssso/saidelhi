// M5 services over the docker MySQL (skipped when unreachable, unmigrated or unseeded).
import type { Pool } from "mysql2/promise";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDb, createPool } from "@/server/db/client";
import { redirect } from "@/server/db/tables";
import { DbRepo } from "@/server/repo/db";
import { createServices } from "@/server/services/create";
import type { Services } from "@/server/services/types";
import { mockServices, NOW } from "./support/services";

const url = process.env.DATABASE_URL ?? "mysql://app:app@127.0.0.1:3307/saidelhi";

async function probe(): Promise<Pool | null> {
  const pool = createPool(url);
  try {
    const [rows] = await pool.query("SELECT COUNT(*) AS n FROM org_unit");
    await pool.query("SELECT 1 FROM `redirect` LIMIT 1");
    if (Array.isArray(rows) && Number((rows[0] as { n: number }).n) > 0) return pool;
  } catch {
    // unreachable or not migrated
  }
  await pool.end().catch(() => {});
  return null;
}

const pool = await probe();

describe.skipIf(!pool)("M5 services over MySQL (integration)", () => {
  let db: Services;
  let repo: DbRepo;
  const mock = mockServices().svc;

  beforeAll(() => {
    repo = new DbRepo(createDb(pool!));
    db = createServices(repo, { now: () => NOW, mediaBase: "/media" });
  });

  afterAll(async () => {
    await pool?.query("DELETE FROM `redirect` WHERE from_path LIKE '/__test%'");
    await pool?.end();
  });

  it("programs list and eye detail agree with the mock implementation", async () => {
    expect(await db.programs.list({})).toEqual(await mock.programs.list({}));
    const eye = await db.programs.byType("eye");
    const mockEye = await mock.programs.byType("eye");
    expect(eye?.kpis).toEqual(mockEye?.kpis);
    expect(eye?.funnel).toEqual(mockEye?.funnel);
    expect(eye?.funnel?.[1].figure.value).toBeNull();
    expect(eye?.partners.map((p) => p.name)).toEqual(mockEye?.partners.map((p) => p.name));
  });

  it("join excludes recurring rows and agrees with the mock implementation", async () => {
    const q = { page: 1, pageSize: 50 } as const;
    const fromDb = await db.join.get(q);
    const fromMock = await mock.join.get(q);
    expect(fromDb.events.data.map((e) => e.id)).toEqual(fromMock.events.data.map((e) => e.id));
    expect(fromDb.events.data.every((e) => !e.recurring)).toBe(true);
  });

  it("districts index, demographics and values agree with the mock implementation", async () => {
    expect(await db.districts.list()).toEqual(await mock.districts.list());
    expect((await db.districts.bySlug("east"))?.demographics).toEqual((await mock.districts.bySlug("east"))?.demographics);
    expect(await db.values.bySlug("shanti")).toEqual(await mock.values.bySlug("shanti"));
  });

  it("centres sort nearest first for a pincode", async () => {
    const res = await db.centres.list({ pincode: "110091", page: 1, pageSize: 100 });
    expect(res.data[0].slug).toBe("mayur-vihar");
    expect(res.data.every((c) => c.distanceKm !== null)).toBe(true);
  });

  it("redirect table row wins over rules and counts a hit", async () => {
    const d = createDb(pool!);
    await d.insert(redirect).values({ fromPath: "/__test-old", toPath: "/news", permanent: false, source: "manual" }).onDuplicateKeyUpdate({ set: { hits: 0 } });
    expect(await db.redirects.resolve("/__test-old/")).toEqual({ to: "/news", permanent: false });
    await new Promise((r) => setTimeout(r, 100));
    const row = await repo.redirectByPath("/__test-old");
    expect(row?.hits).toBeGreaterThanOrEqual(1);
    expect(await db.redirects.resolve("/about-us/")).toEqual({ to: "/about", permanent: true });
  });

  it("article and program probes", async () => {
    expect(await db.articles.exists("eye-camp-mayur-vihar-oct-2026")).toBe(true);
    expect(await db.articles.exists("no-such-article")).toBe(false);
  });
});
