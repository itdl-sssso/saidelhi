import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { PhotoEdits } from "@/contract";
import { EVENT, gallerySetup, hasMarker, jpegWithGps } from "./support/gallery";
import { errCode } from "./support/m6";

const edits = (e: Record<string, unknown>) => PhotoEdits.parse(e);

async function setup() {
  const t = await gallerySetup();
  const bytes = await jpegWithGps(400, 200);
  const r = await t.intake(t.a.coord, bytes);
  if (!r.ok) throw new Error("intake");
  const albumId = await t.g.assign(t.a.coord, [r.photoId], { kind: "event", id: EVENT.eyeMayurCamp });
  return { ...t, id: r.photoId, albumId, bytes };
}

describe("gallery editor", () => {
  it("edit creates derived r1, keeps the original, previews are stripped", async () => {
    const t = await setup();
    const p0 = await t.g.photo(t.a.district, t.id);
    const origKey = [...t.storage.files.keys()].find((k) => k.startsWith("gallery/orig/"))!;
    const origBefore = t.storage.files.get(origKey)!;
    const p1 = await t.g.editPhoto(t.a.district, t.id, { version: p0.version, edits: edits({ rotate: 90, crop: { x: 0, y: 0, w: 1, h: 0.5 } }), caption: { en: "Registration desk", hi: null } });
    expect(p1.revision).toBe(1);
    expect([p1.width, p1.height]).toEqual([200, 200]);
    expect(p1.caption.en).toBe("Registration desk");
    expect([...t.storage.files.keys()].some((k) => /^gallery\/derived\/.+-r1\.jpg$/.test(k))).toBe(true);
    expect(t.storage.files.get(origKey)).toBe(origBefore);
    expect(hasMarker(origBefore)).toBe(true);
    const prev = await t.g.file(t.a.district, t.id, "preview");
    expect(prev.mime).toBe("image/jpeg");
    expect(hasMarker(prev.bytes)).toBe(false);
    expect((await sharp(prev.bytes).metadata()).width).toBe(200);
    const orig = await t.g.file(t.a.district, t.id, "original");
    expect((await sharp(orig.bytes).metadata()).width).toBe(400);
    expect(hasMarker(orig.bytes)).toBe(false);
    // stale version
    expect(await errCode(t.g.editPhoto(t.a.district, t.id, { version: p0.version, edits: null }))).toBe("CONFLICT");
    // permission
    expect(await errCode(t.g.editPhoto(t.a.coord, t.id, { version: p1.version, edits: null }))).toBe("FORBIDDEN");
  });

  it("revert returns to the original; approved photo is republished and the old public file removed", async () => {
    const t = await setup();
    let p = await t.g.approve(t.a.district, t.id, { version: (await t.g.photo(t.a.district, t.id)).version });
    const first = p.publicUrl!.replace("/media/", "");
    expect(t.publicMedia.files.has(first)).toBe(true);
    p = await t.g.editPhoto(t.a.district, t.id, { version: p.version, edits: edits({ flipH: true, brightness: 20 }) });
    expect(p.revision).toBe(1);
    expect(p.publicUrl).toMatch(/-r1\.jpg$/);
    expect(t.publicMedia.files.has(first)).toBe(false);
    expect(t.publicMedia.files.has(p.publicUrl!.replace("/media/", ""))).toBe(true);
    p = await t.g.editPhoto(t.a.district, t.id, { version: p.version, edits: null });
    expect(p.edits).toBeNull();
    expect(p.revision).toBe(2);
    expect(p.publicUrl).toMatch(/-r2\.jpg$/);
    expect([p.width, p.height]).toEqual([400, 200]);
    expect([...t.publicMedia.files.keys()]).toHaveLength(1);
  });

  it("cover rules", async () => {
    const t = await setup();
    const p0 = await t.g.photo(t.a.district, t.id);
    // pending photo cannot be cover
    expect(await errCode(t.g.editPhoto(t.a.district, t.id, { version: p0.version, edits: null, setCover: true }))).toBe("VALIDATION_FAILED");
    await t.g.approve(t.a.district, t.id, { version: p0.version });
    const second = await t.g.upload(t.a.district, { name: "b.jpg", bytes: await jpegWithGps(300, 300, [5, 5, 5]) }, { albumId: t.albumId });
    const s2 = await t.g.approve(t.a.district, second.id, { version: second.version });
    expect(s2.isCover).toBe(false);
    const made = await t.g.editPhoto(t.a.district, second.id, { version: s2.version, edits: null, setCover: true });
    expect(made.isCover).toBe(true);
    expect((await t.g.album(t.a.district, t.albumId)).coverPhotoId).toBe(second.id);
    expect((await t.g.photo(t.a.district, t.id)).isCover).toBe(false);
    // patchPhoto setCover back
    const back = await t.g.patchPhoto(t.a.district, t.id, { version: (await t.g.photo(t.a.district, t.id)).version, setCover: true });
    expect(back.isCover).toBe(true);
  });
});
