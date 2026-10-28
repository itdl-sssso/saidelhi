import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { PhotoEdits } from "@/contract";
import { probe, render } from "@/server/media/image";

async function withGps(w = 400, h = 200, orientation?: number) {
  let s = sharp({ create: { width: w, height: h, channels: 3, background: { r: 200, g: 40, b: 40 } } }).jpeg();
  s = s.withMetadata({ orientation, exif: { IFD0: { Copyright: "secret-owner" }, IFD3: { GPSLatitudeRef: "N", GPSLatitude: "28/1 36/1 0/1", GPSLongitudeRef: "E", GPSLongitude: "77/1 12/1 0/1" } } });
  return new Uint8Array(await s.toBuffer());
}
const edits = (e: Partial<Record<string, unknown>>) => PhotoEdits.parse(e);

describe("gallery image render", () => {
  it("source carries GPS, output carries no metadata", async () => {
    const src = await withGps();
    const before = await sharp(src).metadata();
    expect(before.exif).toBeTruthy();
    expect(Buffer.from(before.exif!).includes(Buffer.from("secret-owner"))).toBe(true);
    const out = await render(src, null, 2400);
    const m = await sharp(out.bytes).metadata();
    expect(m.exif).toBeUndefined();
    expect(m.icc).toBeUndefined();
    expect(m.xmp).toBeUndefined();
    expect(Buffer.from(out.bytes).includes(Buffer.from("secret-owner"))).toBe(false);
    expect(Buffer.from(out.bytes).includes(Buffer.from("GPS"))).toBe(false);
    expect(m.format).toBe("jpeg");
  });
  it("auto-orients and probes display size", async () => {
    const src = await withGps(400, 200, 6);
    expect(await probe(src)).toEqual({ width: 200, height: 400 });
    const out = await render(src, null, 2400);
    expect([out.width, out.height]).toEqual([200, 400]);
  });
  it("rotate 90 swaps width/height, crop uses fractions, max edge applies", async () => {
    const src = await withGps(400, 200);
    const r = await render(src, edits({ rotate: 90 }), 2400);
    expect([r.width, r.height]).toEqual([200, 400]);
    const c = await render(src, edits({ crop: { x: 0.25, y: 0, w: 0.5, h: 0.5 } }), 2400);
    expect([c.width, c.height]).toEqual([200, 100]);
    const rc = await render(src, edits({ rotate: 90, crop: { x: 0, y: 0, w: 1, h: 0.5 } }), 2400);
    expect([rc.width, rc.height]).toEqual([200, 200]);
    const small = await render(src, null, 100);
    expect(Math.max(small.width, small.height)).toBe(100);
  });
  it("brightness changes pixels; null probe on junk", async () => {
    const src = await withGps();
    const a = await sharp((await render(src, null, 100)).bytes).stats();
    const b = await sharp((await render(src, edits({ brightness: 50 }), 100)).bytes).stats();
    expect(b.channels[0].mean).toBeGreaterThan(a.channels[0].mean);
    expect(await probe(new Uint8Array([1, 2, 3]))).toBeNull();
  });
});
