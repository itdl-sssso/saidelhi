// M7.1 over the docker MySQL: media import idempotency (coordinator choice survives), repo approve filter.
// Synthetic discourse (slug `media-test-*`, n = 900051) removed afterwards; skipped when DB is unreachable/unmigrated.
import { and, eq, like } from "drizzle-orm";
import type { Pool } from "mysql2/promise";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDb, createPool, type Db } from "@/server/db/client";
import { newId } from "@/server/db/columns";
import { discourse, discourseMedia } from "@/server/db/tables";
import { MediaIndex, mediaForEntry } from "@/server/domain/discourse-media-import";
import { DbRepo } from "@/server/repo/db";
import { importDiscourseMedia } from "@/server/services/discourse-import";

const url = process.env.DATABASE_URL ?? "mysql://app:app@127.0.0.1:3307/saidelhi";
const N = 900051;

async function probe(): Promise<Pool | null> {
  const pool = createPool(url);
  try {
    await pool.query("SELECT 1 FROM discourse_media LIMIT 1");
    return pool;
  } catch {
    await pool.end().catch(() => {});
    return null;
  }
}
const pool = await probe();

const entries = (title: string) =>
  MediaIndex.parse([
    {
      n: N,
      audio: [{ date: "1970-10-04", heading: title, page: "https://example.org/p", audio: "https://example.org/t.mp3" }],
      videos: [
        { id: "mediaTestHi1", title: "H", duration_s: 60, channel: "C", score: 80, confidence: "high", official: false },
        { id: "mediaTestMd1", title: "M", duration_s: 60, channel: "C", score: 40, confidence: "medium", official: false },
      ],
    },
    { n: 900052, audio: [], videos: [{ id: "unmatchedVid", title: "X", confidence: "high" }] },
  ]).map((e) => ({ n: e.n, media: mediaForEntry(e) }));

describe.skipIf(!pool)("M7.1 discourse media over MySQL (integration)", () => {
  let db: Db;
  let did = "";
  const cleanup = async () => {
    await db.delete(discourse).where(like(discourse.slug, "media-test-%"));
  };

  beforeAll(async () => {
    db = createDb(pool!);
    await cleanup();
    did = newId();
    await db.insert(discourse).values({ id: did, n: N, slug: "media-test-a", titleEn: "Media test", themes: [], notes: [], quotes: [] });
  });
  afterAll(async () => {
    await cleanup();
    await pool?.end();
  });

  it("dry run writes nothing; import is idempotent; approved/sort survive re-import; repo serves approved only", async () => {
    const dry = await importDiscourseMedia(db, entries("A"), { dryRun: true });
    expect(dry).toMatchObject({ created: 3, unmatched: 1, audio: 1, video: 2, approved: 2 });
    expect(await db.select().from(discourseMedia).where(eq(discourseMedia.discourseId, did))).toHaveLength(0);

    const first = await importDiscourseMedia(db, entries("A"));
    expect(first).toMatchObject({ created: 3, unchanged: 0, approved: 2 });
    expect(await importDiscourseMedia(db, entries("A"))).toMatchObject({ created: 0, updated: 0, unchanged: 3 });

    const repo = new DbRepo(db).discourses;
    expect((await repo.approvedMediaBySlug("media-test-a")).map((m) => m.kind)).toEqual(["audio", "video"]);

    const pending = (await repo.mediaFor(did)).find((m) => !m.approved)!;
    expect(await repo.updateMedia(did, pending.id, { approved: true }, [])).toBe("ok");
    expect(await repo.updateMedia(did, "01NOPE", { approved: true }, [])).toBe("missing");
    // Hide the official audio; refresh metadata on re-import: choice stays, title updates.
    const audio = (await repo.mediaFor(did)).find((m) => m.kind === "audio")!;
    await repo.updateMedia(did, audio.id, { approved: false }, []);
    expect(await importDiscourseMedia(db, entries("B"))).toMatchObject({ created: 0, updated: 1, unchanged: 2, approved: 2 });
    const [row] = await db.select().from(discourseMedia).where(and(eq(discourseMedia.discourseId, did), eq(discourseMedia.id, audio.id)));
    expect(row).toMatchObject({ approved: false, title: "B" });
    expect((await repo.approvedMediaBySlug("media-test-a")).map((m) => m.externalId)).toEqual(["mediaTestHi1", "mediaTestMd1"]);
  });
});
