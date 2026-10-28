// Pure crop/transform maths for the photo editor. All rectangles are fractions (0..1) of the
// rotated + flipped image, the same space the server crops in (CONTRACT PhotoEdits).
import type { CropAspect, PhotoEdits } from "@/contract";

export type Crop = NonNullable<PhotoEdits["crop"]>;
export type Rect = { x: number; y: number; w: number; h: number };
export type Rotation = PhotoEdits["rotate"];

export const MIN_SIZE = 0.05;
export const DEFAULT_EDITS: PhotoEdits = { rotate: 0, flipH: false, flipV: false, crop: null, brightness: 0, contrast: 0 };

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Width / height of a preset (null = free). */
export function aspectRatio(a: CropAspect): number | null {
  if (a === "free") return null;
  const [w, h] = a.split(":").map(Number);
  return w / h;
}

/** Fraction-space ratio (w/h) that gives a pixel ratio `ratio` on an image of `imgW` × `imgH` (rotated size). */
export const fractionRatio = (ratio: number, imgW: number, imgH: number) => (ratio * imgH) / imgW;

/** Rotated size of the source image. */
export function rotatedSize(w: number, h: number, rotate: Rotation) {
  return rotate === 90 || rotate === 270 ? { w: h, h: w } : { w, h };
}

/** Largest rect of fraction-ratio `rf` inside `box`, centred on it. */
export function fitRatio(box: Rect, rf: number): Rect {
  let w = box.w;
  let h = w / rf;
  if (h > box.h) {
    h = box.h;
    w = h * rf;
  }
  if (w > 1) {
    w = 1;
    h = w / rf;
  }
  if (h > 1) {
    h = 1;
    w = h * rf;
  }
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  return { x: clamp(cx - w / 2, 0, 1 - w), y: clamp(cy - h / 2, 0, 1 - h), w, h };
}

export type Handle = { dx: -1 | 0 | 1; dy: -1 | 0 | 1 };

/**
 * Resize by dragging `handle` to the pointer position (fractions). `rf` = fixed fraction-space ratio or null.
 * The opposite edge/corner stays put.
 */
export function resizeRect(r: Rect, handle: Handle, px: number, py: number, rf: number | null): Rect {
  const { dx, dy } = handle;
  const right = r.x + r.w;
  const bottom = r.y + r.h;
  const ax = dx > 0 ? r.x : right; // anchor x (corner/edge that stays)
  const ay = dy > 0 ? r.y : bottom;
  const x = clamp(px, 0, 1);
  const y = clamp(py, 0, 1);

  if (rf === null) {
    let x0 = r.x;
    let x1 = right;
    let y0 = r.y;
    let y1 = bottom;
    if (dx < 0) x0 = Math.min(x, right - MIN_SIZE);
    if (dx > 0) x1 = Math.max(x, r.x + MIN_SIZE);
    if (dy < 0) y0 = Math.min(y, bottom - MIN_SIZE);
    if (dy > 0) y1 = Math.max(y, r.y + MIN_SIZE);
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }

  const roomX = dx > 0 ? 1 - ax : dx < 0 ? ax : Number.POSITIVE_INFINITY;
  const roomY = dy > 0 ? 1 - ay : dy < 0 ? ay : Number.POSITIVE_INFINITY;
  let w: number;
  let h: number;
  if (dx !== 0 && dy !== 0) {
    w = Math.min(Math.abs(x - ax), Math.abs(y - ay) * rf);
  } else if (dx !== 0) {
    w = Math.abs(x - ax);
  } else {
    w = Math.abs(y - ay) * rf;
  }
  w = Math.max(w, MIN_SIZE * Math.max(1, rf));
  h = w / rf;
  // Keep inside the image: scale down by the tightest limit.
  const s = Math.min(1, roomX / w, roomY / h, 1 / w, 1 / h);
  w *= s;
  h *= s;
  const nx = dx > 0 ? ax : dx < 0 ? ax - w : clamp(r.x + r.w / 2 - w / 2, 0, 1 - w);
  const ny = dy > 0 ? ay : dy < 0 ? ay - h : clamp(r.y + r.h / 2 - h / 2, 0, 1 - h);
  return { x: nx, y: ny, w, h };
}

/** Move by (dx, dy) fractions, staying inside the image. */
export const moveRect = (r: Rect, dx: number, dy: number): Rect => ({ ...r, x: clamp(r.x + dx, 0, 1 - r.w), y: clamp(r.y + dy, 0, 1 - r.h) });

/** Grow/shrink about the centre by `dw` fractions of width (height follows the ratio or `dh`). */
export function growRect(r: Rect, dw: number, dh: number, rf: number | null): Rect {
  let w = clamp(r.w + dw, MIN_SIZE, 1);
  let h = clamp(r.h + dh, MIN_SIZE, 1);
  if (rf !== null) {
    h = w / rf;
    if (h > 1) {
      h = 1;
      w = h * rf;
    }
    if (h < MIN_SIZE) {
      h = MIN_SIZE;
      w = h * rf;
    }
  }
  const cx = r.x + r.w / 2;
  const cy = r.y + r.h / 2;
  return { x: clamp(cx - w / 2, 0, 1 - w), y: clamp(cy - h / 2, 0, 1 - h), w, h };
}

/** Rotate a crop rect 90° clockwise inside the image. */
export const rotateRectCw = (r: Rect): Rect => ({ x: 1 - (r.y + r.h), y: r.x, w: r.h, h: r.w });
export const rotateRectCcw = (r: Rect): Rect => ({ x: r.y, y: 1 - (r.x + r.w), w: r.h, h: r.w });
export const flipRectH = (r: Rect): Rect => ({ ...r, x: 1 - (r.x + r.w) });
export const flipRectV = (r: Rect): Rect => ({ ...r, y: 1 - (r.y + r.h) });

export function rotateEdits(e: PhotoEdits, dir: 1 | -1): PhotoEdits {
  const rotate = ((e.rotate + (dir === 1 ? 90 : 270)) % 360) as Rotation;
  const crop = e.crop ? { ...(dir === 1 ? rotateRectCw(e.crop) : rotateRectCcw(e.crop)), aspect: (e.crop.aspect === "1:1" ? "1:1" : "free") as CropAspect } : null;
  return { ...e, rotate, crop };
}

export function flipEdits(e: PhotoEdits, axis: "h" | "v"): PhotoEdits {
  const crop = e.crop ? { ...(axis === "h" ? flipRectH(e.crop) : flipRectV(e.crop)), aspect: e.crop.aspect } : null;
  return axis === "h" ? { ...e, flipH: !e.flipH, crop } : { ...e, flipV: !e.flipV, crop };
}

const same = (a: number, b: number) => Math.abs(a - b) < 0.0005;

/** Edits as sent to the server: a crop that covers the whole image is dropped; identity → null. */
export function normalizeEdits(e: PhotoEdits): PhotoEdits | null {
  const full = e.crop && same(e.crop.x, 0) && same(e.crop.y, 0) && same(e.crop.w, 1) && same(e.crop.h, 1);
  const crop = e.crop && !full ? { ...e.crop, x: round(e.crop.x), y: round(e.crop.y), w: round(e.crop.w), h: round(e.crop.h) } : null;
  const out: PhotoEdits = { ...e, crop };
  const identity = out.rotate === 0 && !out.flipH && !out.flipV && !out.crop && out.brightness === 0 && out.contrast === 0;
  return identity ? null : out;
}

const round = (n: number) => Math.round(n * 10000) / 10000;

export const editsEqual = (a: PhotoEdits | null, b: PhotoEdits | null) => JSON.stringify(a ? normalizeEdits(a) : null) === JSON.stringify(b ? normalizeEdits(b) : null);

/** CSS filter that approximates the server's brightness/contrast (-100…100) for the live preview. */
export const cssFilter = (e: Pick<PhotoEdits, "brightness" | "contrast">) => `brightness(${(1 + e.brightness / 100).toFixed(2)}) contrast(${(1 + e.contrast / 100).toFixed(2)})`;
