// M7 B1 over the docker MySQL: importer idempotence / edited-block safety + public discourse reads.
// Uses synthetic placeholder text under n >= 900001 and cleans up; skipped when the DB is unreachable or unmigrated.
import { eq, inArray } from "drizzle-orm";
import type { Pool } from "mysql2/promise";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDb, createPool, type Db } from "@/server/db/client";
import { discourse, discourseBlock } from "@/server/db/tables";
import { buildSnapshot } from "@/server/domain/discourse";
import { type ImportedDiscourse } from "@/server/domain/discourse-import";
import { DbRepo } from "@/server/repo/db";
import { importDiscourses } from "@/server/services/discourse-import";
import { createServices } from "@/server/services/create";
import { NOW } from "./support/services";

const url = process.env.DATABASE_URL ?? "mysql://app:app@127.0.0.1:3307/saidelhi";

async function probe(): Promise<Pool | null> {
  const pool = createPool(url);
  try {
    await pool.query("SELECT 1 FROM discourse LIMIT 1");
    return pool;
  } catch {
    await pool.end().catch(() => {});
    return null;
  }
}

const pool = await probe();
const N = [900001, 900002];

const item = (n: number): ImportedDiscourse => ({
  n,
  slug: `__test-disc-${n}`,
  titleEn: `Test discourse ${n}`,
  whyEn: "Synthetic.",
  collPrint: "Test Vol",
  dateText: "1966",
  isoDate: null,
  place: "",
  occasion: "",
  sourceUrl: null,
  pdfUrl: null,
  retrieved: null,
  themes: ["character"],
  notes: [],
  quotes: [{ en: "alpha line", hi: "अल्फा", blockId: "s1" }, { en: "beta line", hi: null, blockId: "s2" }],
  blocks: [
    { blockId: "s1", idx: 1, type: "para", en: "alpha line here", hi: "अल्फा यहाँ", hiAi: "अल्फा यहाँ" },
    { blockId: "s2", idx: 2, type: "para", en: "beta line here", hi: "बीटा यहाँ", hiAi: "बीटा यहाँ" },
    { blockId: "s3", idx: 3, type: "para", en: "gamma untranslated", hi: null, hiAi: null },
  ],
});

describe.skipIf(!pool)("M7 discourses over MySQL (integration)", () => {
  let db: Db;

  const cleanup = async () => {
    const rows = await db.select({ id: discourse.id }).from(discourse).where(inArray(discourse.n, N));
    if (rows.length) await db.delete(discourse).where(inArray(discourse.id, rows.map((r) => r.id)));
  };

  beforeAll(async () => {
    db = createDb(pool!);
    await cleanup();
  });
  afterAll(async () => {
    await cleanup();
    await pool?.end();
  });

  it("imports idempotently and never overwrites reviewer-edited blocks", async () => {
    const items = N.map(item);
    const first = await importDiscourses(db, items, []);
    expect(first).toMatchObject({ created: 2, blocksCreated: 6 });
    const again = await importDiscourses(db, items, []);
    expect(again).toMatchObject({ created: 0, updated: 0, unchanged: 2, blocksCreated: 0, blocksUpdated: 0 });

    const [d] = await db.select().from(discourse).where(eq(discourse.n, N[0]));
    expect(d.status).toBe("ai_draft");
    const blocks = await db.select().from(discourseBlock).where(eq(discourseBlock.discourseId, d.id));
    expect(blocks.find((b) => b.blockId === "s3")).toMatchObject({ status: "empty", hi: null });
    expect(blocks.find((b) => b.blockId === "s1")).toMatchObject({ status: "ai_draft", hi: "अल्फा यहाँ" });

    // A reviewer edits s1 and approves s2; a re-import with a changed AI draft must keep both.
    await db.update(discourseBlock).set({ hi: "समीक्षक का पाठ", status: "edited" }).where(eq(discourseBlock.id, blocks.find((b) => b.blockId === "s1")!.id));
    await db.update(discourseBlock).set({ status: "approved" }).where(eq(discourseBlock.id, blocks.find((b) => b.blockId === "s2")!.id));
    const changed = item(N[0]);
    changed.blocks = changed.blocks.map((b) => (b.hi ? { ...b, hi: "नया मसौदा", hiAi: "नया मसौदा" } : b));
    const third = await importDiscourses(db, [changed], []);
    expect(third.blocksKept).toBe(2);
    const after = await db.select().from(discourseBlock).where(eq(discourseBlock.discourseId, d.id));
    expect(after.find((b) => b.blockId === "s1")).toMatchObject({ hi: "समीक्षक का पाठ", status: "edited", hiAi: "नया मसौदा" });
    expect(after.find((b) => b.blockId === "s2")).toMatchObject({ hi: "बीटा यहाँ", status: "approved" });
  });

  it("serves published snapshots only, flag-gated, with Hindi search", async () => {
    const [d] = await db.select().from(discourse).where(eq(discourse.n, N[0]));
    const blocks = (await db.select().from(discourseBlock).where(eq(discourseBlock.discourseId, d.id))).map((b) => ({ ...b, hi: b.hi ?? "हिन्दी" }));
    await db.update(discourse).set({ titleHi: "परीक्षण प्रवचन", status: "published", publishedAt: NOW }).where(eq(discourse.id, d.id));
    const [row] = await db.select().from(discourse).where(eq(discourse.id, d.id));
    await db.update(discourse).set({ publishedSnapshot: buildSnapshot(row, blocks) }).where(eq(discourse.id, d.id));

    const repo = new DbRepo(db);
    const flag = (on: boolean) => Object.assign(repo, { settings: async () => new Map([["flags", { discourses: on }]]) });
    const svc = createServices(repo, { now: () => NOW, mediaBase: "/media" });

    flag(false);
    expect(await svc.discourses.list({})).toBeNull();
    expect(await svc.discourses.bySlug(d.slug)).toBeNull();
    expect((await svc.values.bySlug("sathya")).discourses).toBeNull();

    flag(true);
    const list = (await svc.discourses.list({ q: "परीक्षण" }))!;
    expect(list.items.map((i) => i.slug)).toEqual([d.slug]);
    const detail = (await svc.discourses.bySlug(d.slug))!;
    expect(detail.blocks).toHaveLength(3);
    expect(detail.title.hi).toBe("परीक्षण प्रवचन");
    // The second test discourse is imported but unpublished: invisible.
    expect(await svc.discourses.bySlug(`__test-disc-${N[1]}`)).toBeNull();
    expect((await svc.values.bySlug("sathya")).discourses!.length).toBeLessThanOrEqual(3);
  });
});
