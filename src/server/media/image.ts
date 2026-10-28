// Gallery image pipeline (sharp). Every output is a metadata-free JPEG: no EXIF, GPS, ICC or XMP.
import sharp from "sharp";
import type { PhotoEdits } from "@/contract";

export interface Probe {
  width: number;
  height: number;
}

/** Display size of an image after EXIF orientation; null when it cannot be decoded. */
export async function probe(bytes: Uint8Array): Promise<Probe | null> {
  try {
    const m = await sharp(bytes, { failOn: "error" }).metadata();
    if (!m.width || !m.height) return null;
    const swap = (m.orientation ?? 1) >= 5;
    return swap ? { width: m.height, height: m.width } : { width: m.width, height: m.height };
  } catch {
    return null;
  }
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/**
 * Renders the ORIGINAL: auto-orient → rotate (cw) → flip → crop (fractions) → brightness/contrast →
 * fit inside `maxEdge` → JPEG q85. Metadata is never carried over.
 */
export async function render(original: Uint8Array, edits: PhotoEdits | null, maxEdge: number): Promise<{ bytes: Uint8Array; width: number; height: number }> {
  // Orient first (and materialise) so later steps see the upright pixels.
  let img = sharp(await sharp(original).rotate().toBuffer());
  if (edits) {
    if (edits.rotate) img = sharp(await img.rotate(edits.rotate).toBuffer());
    if (edits.flipV) img = sharp(await img.flip().toBuffer());
    if (edits.flipH) img = sharp(await img.flop().toBuffer());
    if (edits.crop) {
      const m = await img.metadata();
      const W = m.width!;
      const H = m.height!;
      const left = clamp(Math.round(edits.crop.x * W), 0, W - 1);
      const top = clamp(Math.round(edits.crop.y * H), 0, H - 1);
      const width = clamp(Math.round(edits.crop.w * W), 1, W - left);
      const height = clamp(Math.round(edits.crop.h * H), 1, H - top);
      img = sharp(await img.extract({ left, top, width, height }).toBuffer());
    }
    if (edits.brightness || edits.contrast) {
      const c = 1 + edits.contrast / 100;
      // linear(a, b): out = a*in + b, keeping mid-grey fixed for contrast, then a brightness offset.
      img = sharp(await img.linear(c, 128 * (1 - c) + edits.brightness * 1.28).toBuffer());
    }
  }
  const { data, info } = await img
    .flatten({ background: "#ffffff" })
    .resize({ width: maxEdge, height: maxEdge, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 85, mozjpeg: false })
    .toBuffer({ resolveWithObject: true });
  return { bytes: new Uint8Array(data), width: info.width, height: info.height };
}
