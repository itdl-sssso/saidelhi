import { describe, expect, it } from "vitest";
import { EVENT, gallerySetup, jpegWithGps } from "./support/gallery";

describe("gallery public", () => {
  it("native published albums appear (cover first, kind by event); pending and rejected never do; filters work", async () => {
    const t = await gallerySetup();
    const before = await t.svc.gallery.albums({ page: 1, pageSize: 48 });
    const base = before.data.length;

    const plain = await t.g.createAlbum(t.a.district, { title: { en: "Guru Poornima 2026", hi: "गुरु पूर्णिमा" }, description: { en: "", hi: null }, date: "2026-07-29", eventId: null, scopeId: null });
    expect(plain.slug).toMatch(/^guru-poornima-2026-[a-z0-9]{6}$/);
    const a = await t.g.upload(t.a.district, { name: "a.jpg", bytes: await jpegWithGps(300, 200, [1, 1, 1]) }, { albumId: plain.id });
    const b = await t.g.upload(t.a.district, { name: "b.jpg", bytes: await jpegWithGps(300, 200, [2, 2, 2]) }, { albumId: plain.id });
    const c = await t.g.upload(t.a.district, { name: "c.jpg", bytes: await jpegWithGps(300, 200, [3, 3, 3]) }, { albumId: plain.id });
    const ap = await t.g.approve(t.a.district, a.id, { version: a.version });
    const bp = await t.g.approve(t.a.district, b.id, { version: b.version });
    await t.g.reject(t.a.district, c.id, { version: c.version, reason: "dup" });
    await t.g.editPhoto(t.a.district, b.id, { version: bp.version, edits: null, setCover: true, caption: { en: "Aarti", hi: "आरती" } });
    // draft: hidden
    expect((await t.svc.gallery.albums({ page: 1, pageSize: 48 })).data).toHaveLength(base);
    const fresh = await t.g.album(t.a.district, plain.id);
    await t.g.patchAlbum(t.a.district, plain.id, { version: fresh.version, status: "published" });

    const list = await t.svc.gallery.albums({ page: 1, pageSize: 48 });
    expect(list.data).toHaveLength(base + 1);
    const card = list.data.find((x) => x.slug === plain.slug)!;
    expect(card.kind).toBe("album");
    expect(card.count).toBe(2);
    expect(card.href).toBeNull();
    expect(card.date.startsWith("2026-07-28") || card.date.startsWith("2026-07-29")).toBe(true);
    const detail = (await t.svc.gallery.album(plain.slug))!;
    expect(detail.photos).toHaveLength(2);
    expect(detail.photos[0].caption?.en).toBe("Aarti"); // cover first
    expect(detail.photos.every((p) => p.src.startsWith("/media/gallery/"))).toBe(true);
    expect(detail.photos.some((p) => p.src === ap.publicUrl)).toBe(true);
    expect((await t.svc.gallery.albums({ page: 1, pageSize: 48, kind: "album" })).data.map((x) => x.slug)).toEqual([plain.slug]);
    expect((await t.svc.gallery.albums({ page: 1, pageSize: 48, year: 1999 })).data).toHaveLength(0);
    expect(list.facets.kinds.some((k) => k.kind === "album")).toBe(true);
    expect(list.facets.years).toContain(2026);
    // unknown slug
    expect(await t.svc.gallery.exists("nope")).toBe(false);
  });

  it("an album linked to an event replaces the derived event card", async () => {
    const t = await gallerySetup();
    const al = await t.g.createAlbum(t.a.district, { eventId: EVENT.eyeCamp, scopeId: null, description: { en: "", hi: null } });
    const p = await t.g.upload(t.a.state, { name: "a.jpg", bytes: await jpegWithGps() }, { albumId: al.id });
    await t.g.approve(t.a.state, p.id, { version: p.version });
    const fresh = await t.g.album(t.a.state, al.id);
    await t.g.patchAlbum(t.a.state, al.id, { version: fresh.version, status: "published" });
    const slugs = (await t.svc.gallery.albums({ page: 1, pageSize: 48 })).data.map((x) => x.slug);
    expect(slugs).toContain(al.slug);
    expect(slugs).not.toContain(`event-${EVENT.eyeCamp}`);
  });
});
