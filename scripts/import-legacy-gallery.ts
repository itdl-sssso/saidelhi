/**
 * Turns each legacy news post's gallery images into a published, approved public gallery album
 * (title = post title, date = post date, scope = the post's district tag when it has one).
 *
 *   pnpm db:import-legacy-gallery
 *
 * Needs: db:import-legacy + db:seed done. Originals are copied to private storage
 * (gallery/orig/), the public copy is re-encoded by the gallery pipeline (sharp: EXIF/GPS stripped,
 * <= 2400 px) as gallery/<id>-r0.jpg under MEDIA_ROOT. Legacy tables and legacy files are only read.
 * Idempotent: a photo is keyed by `from = "legacy:<image path>"`, an album by the post's slug.
 */
import { readFile } from "node:fs/promises";
import { asc, eq, inArray } from "drizzle-orm";
import { GALLERY_LIMITS } from "../src/contract";
import { closeDb, getDb } from "../src/server/db/client";
import { newId } from "../src/server/db/columns";
import { postcontentContentpostimage as postImage, postcontentPostcontent as post } from "../src/server/db/legacy";
import { articleI18n } from "../src/server/db/tables";
import { PUBLIC_ARTICLE_LETTERS } from "../src/server/domain/articles";
import { istDate } from "../src/server/domain/time";
import { env } from "../src/server/env";
import { DiskStorage, resolveUnder, sniffMime } from "../src/server/files";
import { render } from "../src/server/media/image";
import { DbRepo } from "../src/server/repo/db";
import { type AlbumData, albumKeys, albumsOf, type PhotoData, photoKeys, photosOf } from "../src/server/services/gallery-store";

const LEGACY_FROM = "legacy:";

async function main() {
  const db = getDb();
  const repo = new DbRepo(db);
  const e = env();
  const priv = new DiskStorage(e.MEDIA_PRIVATE_ROOT);
  const pub = new DiskStorage(e.MEDIA_ROOT);

  const rows = await db.select({ p: post, i18n: articleI18n }).from(post).leftJoin(articleI18n, eq(articleI18n.legacyId, post.id)).orderBy(asc(post.id));
  const posts = rows.filter((r) => (!r.i18n || r.i18n.status === "published") && (PUBLIC_ARTICLE_LETTERS as readonly string[]).includes(r.p.category));
  const imgs = posts.length
    ? await db
        .select()
        .from(postImage)
        .where(
          inArray(
            postImage.blogPostId,
            posts.map((r) => r.p.id),
          ),
        )
        .orderBy(asc(postImage.order), asc(postImage.id))
    : [];

  const albums = await albumsOf(repo);
  const bySlug = new Map(albums.map((a) => [a.data.slug, a]));
  const stats = { posts: 0, albumsCreated: 0, albumsExisting: 0, photosCreated: 0, photosExisting: 0, missingFile: 0, undecodable: 0 };

  for (const { p, i18n } of posts) {
    const mine = imgs.filter((i) => i.blogPostId === p.id);
    if (!mine.length) continue;
    stats.posts++;
    let album = bySlug.get(p.slug);
    if (!album) {
      const id = newId();
      const data: AlbumData = {
        slug: p.slug,
        title: { en: p.title, hi: i18n?.titleHi ?? null },
        description: { en: p.shortDescription ?? "", hi: i18n?.summaryHi ?? null },
        date: istDate(p.createdAt),
        status: "published",
        eventId: null,
        scopeId: i18n?.districtId ?? null,
        coverPhotoId: null,
        createdBy: null,
      };
      const r = await repo.m6.docInsert<AlbumData>("gallery_album", { id, ...albumKeys(data), data });
      if (!r.ok) throw new Error("album insert failed");
      album = (await repo.m6.docGet<AlbumData>("gallery_album", id))!;
      bySlug.set(p.slug, album);
      stats.albumsCreated++;
    } else stats.albumsExisting++;

    const existing = await photosOf(repo, { albumId: album.id });
    let order = existing.reduce((m, x) => Math.max(m, x.data.order), 0);
    let cover = album.data.coverPhotoId;
    for (const img of mine) {
      const from = `${LEGACY_FROM}${img.image}`;
      if (existing.some((x) => x.data.from === from)) {
        stats.photosExisting++;
        continue;
      }
      const file = resolveUnder(e.MEDIA_ROOT, img.image.split("/"));
      const bytes = file ? await readFile(file).then((b) => new Uint8Array(b), () => null) : null;
      if (!bytes) {
        stats.missingFile++;
        continue;
      }
      const kind = sniffMime(bytes);
      if (!kind || !(GALLERY_LIMITS.mimes as readonly string[]).includes(kind.mime)) {
        stats.undecodable++;
        continue;
      }
      let out: Awaited<ReturnType<typeof render>>;
      try {
        out = await render(bytes, null, GALLERY_LIMITS.maxEdge);
      } catch {
        stats.undecodable++;
        continue;
      }
      const id = newId();
      const origPath = `gallery/orig/${id.toLowerCase()}.${kind.ext}`;
      const publicPath = `gallery/${id.toLowerCase()}-r0.jpg`;
      await priv.put(origPath, bytes);
      await pub.put(publicPath, out.bytes);
      const caption = (img.caption ?? "").trim();
      const at = p.createdAt.toISOString();
      const data: PhotoData = {
        status: "approved",
        source: "portal",
        albumId: album.id,
        eventId: null,
        scopeId: album.data.scopeId,
        caption: { en: caption, hi: null },
        alt: { en: caption || p.title, hi: null },
        origPath,
        origMime: kind.mime,
        bytes: bytes.byteLength,
        width: out.width,
        height: out.height,
        edits: null,
        revision: 0,
        derivedPath: null,
        publicPath,
        from,
        uploaderId: null,
        conversationId: null,
        receivedAt: at,
        reviewedBy: "Legacy import",
        reviewedAt: new Date().toISOString(),
        rejectReason: null,
        order: ++order,
      };
      const r = await repo.m6.docInsert<PhotoData>("gallery_photo", { id, ...photoKeys(data), data });
      if (!r.ok) throw new Error("photo insert failed");
      cover ??= id;
      stats.photosCreated++;
    }
    if (cover && cover !== album.data.coverPhotoId) {
      const next: AlbumData = { ...album.data, coverPhotoId: cover };
      await repo.m6.docUpdate<AlbumData>("gallery_album", { id: album.id, ...albumKeys(next), data: next }, album.version);
    }
  }
  console.log(`gallery import: posts with images ${stats.posts}; albums +${stats.albumsCreated} (existing ${stats.albumsExisting}); photos +${stats.photosCreated} (existing ${stats.photosExisting}); missing files ${stats.missingFile}; skipped undecodable ${stats.undecodable}`);
  await closeDb();
}

main().catch(async (err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
  await closeDb();
});
