// Runs the real services against the docker MySQL when it is reachable and
// seeded (pnpm db:up && pnpm db:migrate && pnpm db:seed); skipped otherwise.
import type { Pool } from "mysql2/promise";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Article, ArticleDetail, CentreDetail, EventPublic, HomePayload, ImpactPayload, Paged } from "@/contract";
import { createDb, createPool } from "@/server/db/client";
import { EVENT } from "@/server/mock/fixtures";
import { DbRepo } from "@/server/repo/db";
import { createServices } from "@/server/services/create";
import type { Services } from "@/server/services/types";
import { mockServices, NOW } from "./support/services";

const url = process.env.DATABASE_URL ?? "mysql://app:app@127.0.0.1:3307/saidelhi";

async function probe(): Promise<Pool | null> {
  const pool = createPool(url);
  try {
    const [rows] = await pool.query("SELECT COUNT(*) AS n FROM org_unit");
    if (Array.isArray(rows) && Number((rows[0] as { n: number }).n) > 0) return pool;
  } catch {
    // unreachable or not migrated
  }
  await pool.end().catch(() => {});
  return null;
}

const pool = await probe();

describe.skipIf(!pool)("db-backed services (integration)", () => {
  let db: Services;

  beforeAll(() => {
    db = createServices(new DbRepo(createDb(pool!)), { now: () => NOW, mediaBase: "/media" });
  });

  afterAll(async () => {
    await pool?.end();
  });

  it("eye camp results match the mock implementation", async () => {
    const fromDb = EventPublic.parse(await db.events.byId(EVENT.eyeCamp));
    const fromMock = await mockServices().svc.events.byId(EVENT.eyeCamp);
    expect(fromDb.results).toEqual(fromMock?.results);
    expect(fromDb.articleSlug).toBe("eye-camp-mayur-vihar-oct-2026");
    expect(await db.events.byId(EVENT.draft)).toBeNull();
  });

  it("impact, home and centre payloads are contract-valid and agree with mock", async () => {
    const impact = ImpactPayload.parse(await db.impact.get({ period: "this_year" }));
    const mockImpact = await mockServices().svc.impact.get({ period: "this_year" });
    expect(impact.tiles).toEqual(mockImpact?.tiles);
    expect(impact.byDistrict).toEqual(mockImpact?.byDistrict);
    HomePayload.parse(await db.home.get());
    const centre = CentreDetail.parse(await db.centres.bySlug("mayur-vihar"));
    expect(centre.schedule).toHaveLength(3);
  });

  it("serves imported legacy articles with mapped categories and sanitised bodies", async () => {
    const page = Paged(Article).parse(await db.articles.list({ c: "all", page: 1, pageSize: 100 }));
    expect(page.meta.total).toBeGreaterThan(0);
    for (const a of page.data) expect(a.bodyHtml.en).not.toMatch(/<script|on\w+=/i);
    const detail = ArticleDetail.parse(await db.articles.bySlug(page.data[0].slug));
    if (detail.next) expect(detail.next.slug).not.toBe(detail.slug);
    if (detail.prev) expect(detail.prev.slug).not.toBe(detail.slug);
  });
});
