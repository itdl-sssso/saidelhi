import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { PALETTE_KINDS } from "@/contract";
import { newField } from "@/features/admin/forms/builder-model";
import { normalizePhoto } from "@/server/media/image";

describe("photos field", () => {
  it("palette Photos makes a photos-only file field, max 5", () => {
    expect(PALETTE_KINDS).toContain("photos");
    const f = newField("photos", new Set());
    expect(f).toMatchObject({ kind: "file", photos: true, max: 5 });
  });
  it("normalizePhoto caps the long edge at 1600 and strips GPS", async () => {
    const src = new Uint8Array(
      await sharp({ create: { width: 3200, height: 2400, channels: 3, background: "#c33" } })
        .jpeg()
        .withMetadata({ exif: { IFD3: { GPSLatitudeRef: "N", GPSLatitude: "28/1 36/1 0/1" } } })
        .toBuffer(),
    );
    const out = await normalizePhoto(src, 1600);
    expect(out).not.toBeNull();
    const m = await sharp(out!).metadata();
    expect(Math.max(m.width!, m.height!)).toBe(1600);
    expect(m.exif).toBeUndefined();
    expect(await normalizePhoto(new TextEncoder().encode("nope"), 1600)).toBeNull();
  });
});
