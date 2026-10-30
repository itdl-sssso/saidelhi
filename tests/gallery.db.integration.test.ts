// Gallery doc tables over the docker MySQL (migration 0010): keys, versions, filters. Skipped when unreachable/unmigrated.
import type { Pool } from "mysql2/promise";
import { afterAll, describe, expect, it } from "vitest";
import { createDb, createPool } from "@/server/db/client";
import { newId } from "@/server/db/columns";
import { DbRepo } from "@/server/repo/db";

const url = process.env.DATABASE_URL ?? "mysql://app:app@127.0.0.1:3307/saidelhi";

async function probe(): Promise<Pool | null> {
  const pool = createPool(url);
  try {
    await pool.query("SELECT 1 FROM gallery_photo LIMIT 1");
    await pool.query("SELECT 1 FROM gallery_album LIMIT 1");
    return pool;
  } catch {
    await pool.end().catch(() => {});
    return null;
  }
}
const pool = await probe();
const ids: string[] = [];

afterAll(async () => {
  if (!pool) return;
  for (const id of ids) await pool.query("DELETE FROM gallery_photo WHERE id = ?", [id]);
  await pool.end();
});

describe.skipIf(!pool)("gallery tables", () => {
  it("insert, key filters, optimistic update", async () => {
    const repo = new DbRepo(createDb(pool!));
    const id = newId();
    ids.push(id);
    const data = { status: "pending", albumId: null, order: 0 };
    expect((await repo.m6.docInsert("gallery_photo", { id, k1: "none", k2: "pending", data })).ok).toBe(true);
    expect((await repo.m6.docList("gallery_photo", { k1: "none", k2: "pending" })).some((r) => r.id === id)).toBe(true);
    expect((await repo.m6.docList("gallery_photo", { k1: "none", k2: "approved" })).some((r) => r.id === id)).toBe(false);
    const r = await repo.m6.docUpdate("gallery_photo", { id, k1: "ALB1", k2: "approved", data: { ...data, status: "approved" } }, 1);
    expect(r).toEqual({ ok: true, version: 2 });
    expect(await repo.m6.docUpdate("gallery_photo", { id, k1: "ALB1", k2: "approved", data }, 1)).toEqual({ ok: false, reason: "conflict" });
    const got = await repo.m6.docGet<typeof data>("gallery_photo", id);
    expect(got?.k1).toBe("ALB1");
    expect(got?.data.status).toBe("approved");
  });
});
