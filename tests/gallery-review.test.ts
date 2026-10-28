import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { EVENT, gallerySetup, hasMarker, jpegWithGps } from "./support/gallery";
import { errCode } from "./support/m6";

async function pendingInAlbum() {
  const t = await gallerySetup();
  const r = await t.intake(t.a.coord, undefined, "Eye camp");
  if (!r.ok) throw new Error("intake");
  const albumId = await t.g.assign(t.a.coord, [r.photoId], { kind: "event", id: EVENT.eyeMayurCamp });
  return { ...t, id: r.photoId, albumId };
}

describe("gallery review", () => {
  it("approve publishes a stripped JPEG; album stays hidden until published", async () => {
    const t = await pendingInAlbum();
    const p0 = await t.g.photo(t.a.district, t.id);
    expect(p0.status).toBe("pending");
    expect(p0.publicUrl).toBeNull();
    expect(p0.event?.id).toBe(EVENT.eyeMayurCamp);
    expect([...t.publicMedia.files.keys()]).toEqual([]);

    const p1 = await t.g.approve(t.a.district, t.id, { version: p0.version });
    expect(p1.status).toBe("approved");
    expect(p1.publicUrl).toMatch(/^\/media\/gallery\/.+-r0\.jpg$/);
    expect(p1.isCover).toBe(true);
    const rel = p1.publicUrl!.replace("/media/", "");
    const pub = t.publicMedia.files.get(rel)!;
    expect(pub).toBeTruthy();
    expect(hasMarker(pub)).toBe(false);
    expect((await sharp(pub).metadata()).exif).toBeUndefined();
    // original kept privately with metadata intact
    expect([...t.storage.files.keys()].some((k) => k.startsWith("gallery/orig/"))).toBe(true);
    // draft album: nothing public
    expect((await t.svc.gallery.albums({ page: 1, pageSize: 12 })).data.some((x) => x.kind === "event" && x.title.en.includes("Eye screening camp, Mayur"))).toBe(false);

    const album = await t.g.album(t.a.district, t.albumId);
    expect(album.status).toBe("draft");
    const pub1 = await t.g.patchAlbum(t.a.district, t.albumId, { version: album.version, status: "published" });
    expect(pub1.publicUrl).toBe(`/gallery/${album.slug}`);
    const list = await t.svc.gallery.albums({ page: 1, pageSize: 12 });
    const hit = list.data.find((x) => x.slug === album.slug)!;
    expect(hit.kind).toBe("event");
    expect(hit.href).toBe(`/events/${EVENT.eyeMayurCamp}`);
    const detail = (await t.svc.gallery.album(album.slug))!;
    expect(detail.photos.map((x) => x.src)).toEqual([p1.publicUrl]);
    // unpublish hides it again
    await t.g.patchAlbum(t.a.district, t.albumId, { version: pub1.version, status: "draft" });
    expect(await t.svc.gallery.exists(album.slug)).toBe(false);
  });

  it("reject removes the public file and hides the photo", async () => {
    const t = await pendingInAlbum();
    const p = await t.g.approve(t.a.district, t.id, { version: (await t.g.photo(t.a.district, t.id)).version });
    const album = await t.g.album(t.a.district, t.albumId);
    await t.g.patchAlbum(t.a.district, t.albumId, { version: album.version, status: "published" });
    const rel = p.publicUrl!.replace("/media/", "");
    expect(t.publicMedia.files.has(rel)).toBe(true);
    const r = await t.g.reject(t.a.district, t.id, { version: p.version, reason: "Faces of children" });
    expect(r.status).toBe("rejected");
    expect(r.publicUrl).toBeNull();
    expect(r.rejectReason).toBe("Faces of children");
    expect(t.publicMedia.files.has(rel)).toBe(false);
    expect(await t.svc.gallery.exists(album.slug)).toBe(false);
  });

  it("denials: permission, scope, version, publish without approved photo, album required", async () => {
    const t = await pendingInAlbum();
    const v = (await t.g.photo(t.a.district, t.id)).version;
    expect(await errCode(t.g.approve(t.a.coord, t.id, { version: v }))).toBe("FORBIDDEN");
    expect(await errCode(t.g.approve(t.a.otherDistrict, t.id, { version: v }))).toBe("NOT_FOUND");
    expect(await errCode(t.g.photo(t.a.otherCoord, t.id))).toBe("NOT_FOUND");
    expect(await errCode(t.g.approve(t.a.district, t.id, { version: v + 5 }))).toBe("CONFLICT");
    const album = await t.g.album(t.a.district, t.albumId);
    expect(await errCode(t.g.patchAlbum(t.a.district, t.albumId, { version: album.version, status: "published" }))).toBe("VALIDATION_FAILED");
    expect(await errCode(t.g.patchAlbum(t.a.coord, t.albumId, { version: album.version, status: "published" }))).toBe("FORBIDDEN");
    // photo with no album needs one
    const loose = await t.g.upload(t.a.district, { name: "x.jpg", bytes: await jpegWithGps() }, {});
    const e = await t.g.approve(t.a.district, loose.id, { version: loose.version }).catch((x) => x);
    expect(e.code).toBe("VALIDATION_FAILED");
    expect(e.fields.albumId).toBeTruthy();
    // stale version after a first change
    const ok = await t.g.approve(t.a.district, t.id, { version: v });
    expect(await errCode(t.g.reject(t.a.district, t.id, { version: v, reason: "x" }))).toBe("CONFLICT");
    expect(ok.version).toBeGreaterThan(v);
  });

  it("bulk approve and reject report done and failed ids; scope respected", async () => {
    const t = await gallerySetup();
    const ids: string[] = [];
    for (let i = 0; i < 3; i++) {
      const r = await t.intake(t.a.coord);
      if (r.ok) ids.push(r.photoId);
    }
    const albumId = await t.g.assign(t.a.coord, ids, { kind: "event", id: EVENT.eyeMayurCamp });
    const res = await t.g.bulk(t.a.district, { action: "approve", ids: [...ids.slice(0, 2), "nope"] });
    expect(res.done).toEqual(ids.slice(0, 2));
    expect(res.failed).toEqual([{ id: "nope", code: "NOT_FOUND" }]);
    expect((await t.g.bulk(t.a.otherDistrict, { action: "reject", ids: [ids[2]], reason: "r" })).failed[0].code).toBe("NOT_FOUND");
    const rej = await t.g.bulk(t.a.district, { action: "reject", ids: [ids[2]], reason: "Blurry" });
    expect(rej.done).toEqual([ids[2]]);
    const list = await t.g.photos(t.a.district, { status: "approved", page: 1, pageSize: 24, albumId });
    expect(list.data).toHaveLength(2);
    expect(list.meta.counts).toEqual({ pending: 0, approved: 2, rejected: 1 });
    expect(await errCode(t.g.bulk(t.a.district, { action: "reject", ids: [ids[0]] }))).toBe("VALIDATION_FAILED");
  });

  it("album from event is reused; cover must be approved; order is applied; audit rows written", async () => {
    const t = await gallerySetup();
    const a1 = await t.g.createAlbum(t.a.coord, { eventId: EVENT.eyeMayurCamp, scopeId: null, description: { en: "", hi: null } });
    const a2 = await t.g.createAlbum(t.a.district, { eventId: EVENT.eyeMayurCamp, scopeId: null, description: { en: "", hi: null } });
    expect(a2.id).toBe(a1.id);
    expect(a1.title.en).toContain("Mayur Vihar");
    expect(await errCode(t.g.createAlbum(t.a.otherCoord, { eventId: EVENT.eyeMayurCamp, scopeId: null, description: { en: "", hi: null } }))).toBe("NOT_FOUND");
    const p1 = await t.g.upload(t.a.district, { name: "1.jpg", bytes: await jpegWithGps(300, 200, [1, 2, 3]) }, { albumId: a1.id });
    const p2 = await t.g.upload(t.a.district, { name: "2.jpg", bytes: await jpegWithGps(300, 200, [9, 9, 9]) }, { albumId: a1.id });
    await t.g.approve(t.a.district, p1.id, { version: p1.version });
    await t.g.approve(t.a.district, p2.id, { version: p2.version });
    const d = await t.g.album(t.a.district, a1.id);
    expect(d.coverPhotoId).toBe(p1.id);
    const bad = await t.g.patchAlbum(t.a.district, a1.id, { version: d.version, coverPhotoId: "zzz" }).catch((x) => x);
    expect(bad.code).toBe("VALIDATION_FAILED");
    const re = await t.g.patchAlbum(t.a.district, a1.id, { version: d.version, photoOrder: [p2.id, p1.id], coverPhotoId: p2.id });
    expect(re.coverPhotoId).toBe(p2.id);
    expect((await t.g.album(t.a.district, a1.id)).photos.map((x) => x.id)).toEqual([p2.id, p1.id]);
    const rows = (await t.repo.portal.listAudit({ entity: "gallery_photo", limit: 100, offset: 0 })).rows.map((r) => r.action);
    expect(rows).toEqual(expect.arrayContaining(["gallery.photo.upload", "gallery.photo.approve"]));
    expect((await t.repo.portal.listAudit({ entity: "gallery_album", limit: 100, offset: 0 })).rows.map((r) => r.action)).toContain("gallery.album.create");
  });
});
