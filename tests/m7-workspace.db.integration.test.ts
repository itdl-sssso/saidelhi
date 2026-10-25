// M7 B2 over the docker MySQL: workspace create/edit/approve/publish with optimistic versions and audit.
// Synthetic rows (slug `ws-test-*`, n >= 900011), removed afterwards; skipped when the DB is unreachable/unmigrated.
import { eq, like } from "drizzle-orm";
import type { Pool } from "mysql2/promise";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type DiscourseCreate, DiscourseCreate as CreateSchema } from "@/contract";
import { type Actor, ROLE_PERMISSIONS } from "@/server/auth/rbac";
import { createDb, createPool, type Db } from "@/server/db/client";
import { appUser, auditLog, discourse } from "@/server/db/tables";
import { ApiError } from "@/server/http/errors";
import { DbRepo } from "@/server/repo/db";
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
const code = (p: Promise<unknown>) => p.then(() => "ok", (e) => (e instanceof ApiError ? e.code : `other:${String(e)}`));

const create: DiscourseCreate = CreateSchema.parse({
  title: { en: "WS test talk" },
  slug: "ws-test-new",
  meta: { collPrint: "Test Vol", collOnline: null, date: "1966", place: "", occasion: "", sourceUrl: null, pdfUrl: null, retrieved: null },
  themes: ["character"],
  why: { en: "Synthetic." },
  sourceText: "# Head\n\nAlpha line here.\n\nBeta line here.",
});

describe.skipIf(!pool)("M7 workspace over MySQL (integration)", () => {
  let db: Db;
  let userId = "";
  const cleanup = async () => {
    await db.delete(discourse).where(like(discourse.slug, "ws-test-%"));
  };

  beforeAll(async () => {
    db = createDb(pool!);
    await cleanup();
    userId = (await db.select({ id: appUser.id }).from(appUser).limit(1))[0]?.id ?? "";
  });
  afterAll(async () => {
    await cleanup();
    await pool?.end();
  });

  it("create → edit → approve → publish → re-edit keeps public text → unpublish", async () => {
    expect(userId).not.toBe("");
    const repo = new DbRepo(db);
    let flag = false;
    Object.assign(repo, { settings: async () => new Map([["flags", { discourses: flag }]]) });
    const tags: string[][] = [];
    const svc = createServices(repo, { now: () => NOW, mediaBase: "/media", revalidate: (t) => tags.push([...t]) });
    const actor: Actor = {
      userId,
      name: "WS tester",
      role: "content_editor",
      scopeId: null,
      all: true,
      unitIds: new Set(),
      permissions: new Set(ROLE_PERMISSIONS.content_editor),
      ctx: { requestId: "ws-test", ipHash: null },
    };
    const w = svc.portal.discourses;

    // Park the numbering far above real rows so a real discourse is never touched.
    await db.insert(discourse).values({ n: 900011, slug: "ws-test-base", titleEn: "base", themes: ["character"], notes: [], quotes: [], status: "not_started" });

    const d = await w.create(actor, create);
    expect(d).toMatchObject({ n: 900012, status: "not_started", version: 1 });
    expect(d.blocks).toHaveLength(3);
    expect(await code(w.create(actor, create))).toBe("VALIDATION_FAILED"); // slug taken

    const e = await w.patch(actor, d.id, {
      version: 1,
      reviewerId: userId,
      blocks: d.blocks.map((b) => ({ id: b.id, hi: `हिन्दी ${b.idx}`, status: "approved" as const })),
      quotes: [
        { en: "Alpha line", hi: null, blockId: "s2" },
        { en: "Beta line", hi: null, blockId: "s3" },
      ],
    }).catch((err) => err);
    // reviewer must hold discourses.review; the first DB user may not — retry without one when refused
    const edited = e instanceof ApiError
      ? await w.patch(actor, d.id, {
          version: 1,
          blocks: d.blocks.map((b) => ({ id: b.id, hi: `हिन्दी ${b.idx}`, status: "approved" as const })),
          quotes: [
            { en: "Alpha line", hi: null, blockId: "s2" },
            { en: "Beta line", hi: null, blockId: "s3" },
          ],
        })
      : e;
    expect(edited.version).toBe(2);
    expect(await code(w.patch(actor, d.id, { version: 1, title: { en: "stale", hi: null } }))).toBe("CONFLICT");
    expect((await w.patch(actor, d.id, { version: 2, quotes: [{ en: "Nope", hi: null, blockId: "s2" }] }).catch((x) => x)).fields).toHaveProperty("quotes.0");

    const approved = await w.approve(actor, d.id, { version: edited.version });
    expect(approved.status).toBe("approved");
    const err = await w.publish(actor, d.id, { version: approved.version }).catch((x) => x);
    expect(Object.keys(err.fields)).toEqual(["flag_off"]);

    flag = true;
    const pub = await w.publish(actor, d.id, { version: approved.version });
    expect(pub.status).toBe("published");
    expect(tags.at(-1)).toEqual(["discourses"]);
    expect((await svc.discourses.bySlug("ws-test-new"))!.blocks[1].hi).toBe("हिन्दी 2");

    const re = await w.patch(actor, d.id, { version: pub.version, blocks: [{ id: "s2", hi: "बदला हुआ" }] });
    expect(re.status).toBe("in_review");
    expect((await svc.discourses.bySlug("ws-test-new"))!.blocks[1].hi).toBe("हिन्दी 2");
    expect((await w.list(actor, { page: 1, pageSize: 200, q: "ws test" })).data.map((r) => r.slug)).toContain("ws-test-new");

    expect(re).toMatchObject({ dirtySincePublish: true });
    expect(re.blocks[1].differsFromPublished).toBe(true);
    const rv = await w.revert(actor, d.id, { scope: "all", version: re.version });
    expect(rv).toMatchObject({ status: "published", dirtySincePublish: false });
    expect(rv.blocks[1]).toMatchObject({ hi: "हिन्दी 2", status: "approved", differsFromPublished: false });
    expect(await code(w.revert(actor, d.id, { scope: "all", version: re.version }))).toBe("CONFLICT");
    const re2 = await w.patch(actor, d.id, { version: rv.version, blocks: [{ id: "s2", hi: "फिर बदला" }] });
    const rb = await w.revert(actor, d.id, { scope: "block", blockId: "s2", source: "published", version: re2.version });
    expect(rb).toMatchObject({ status: "published", dirtySincePublish: false });

    const re3 = await w.patch(actor, d.id, { version: rb.version, blocks: [{ id: "s2", hi: "तीसरा" }] });
    const un = await w.unpublish(actor, d.id, { version: re3.version });
    expect(un).toMatchObject({ status: "in_review", publishedAt: null });
    expect(await svc.discourses.bySlug("ws-test-new")).toBeNull();

    const actions = (await db.select({ a: auditLog.action }).from(auditLog).where(eq(auditLog.entityId, d.id))).map((r) => r.a);
    expect(actions).toEqual(expect.arrayContaining(["discourse.create", "discourse.update", "discourse.approve", "discourse.publish", "discourse.unpublish", "discourse.revert"]));
  });
});
