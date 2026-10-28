import { describe, expect, it } from "vitest";
import { PhotoEdits } from "@/contract";
import { DEFAULT_EDITS, fitRatio, flipEdits, fractionRatio, growRect, moveRect, normalizeEdits, resizeRect, rotateEdits } from "@/features/gallery-editor/geometry";

const inside = (r: { x: number; y: number; w: number; h: number }) => r.x >= -1e-9 && r.y >= -1e-9 && r.x + r.w <= 1 + 1e-9 && r.y + r.h <= 1 + 1e-9;

describe("gallery editor geometry", () => {
  it("fits a ratio inside the image", () => {
    const rf = fractionRatio(1, 4000, 3000); // 1:1 on a 4:3 photo
    const r = fitRatio({ x: 0, y: 0, w: 1, h: 1 }, rf);
    expect(r.w * 4000).toBeCloseTo(r.h * 3000);
    expect(inside(r)).toBe(true);
  });
  it("keeps the ratio and the image bounds while resizing", () => {
    const rf = fractionRatio(16 / 9, 4000, 3000);
    const start = { x: 0.1, y: 0.1, w: 0.4, h: 0.4 / rf };
    for (const [px, py] of [[1.4, 1.4], [0.9, 0.2], [-0.5, 0.5]]) {
      const r = resizeRect(start, { dx: 1, dy: 1 }, px, py, rf);
      expect(inside(r)).toBe(true);
      expect(r.w / r.h).toBeCloseTo(rf);
    }
  });
  it("free resize anchors the opposite corner", () => {
    const r = resizeRect({ x: 0.2, y: 0.2, w: 0.4, h: 0.4 }, { dx: -1, dy: -1 }, 0.1, 0.05, null);
    expect(r.x + r.w).toBeCloseTo(0.6);
    expect(r.y + r.h).toBeCloseTo(0.6);
  });
  it("moves and grows within bounds", () => {
    expect(inside(moveRect({ x: 0.5, y: 0.5, w: 0.5, h: 0.5 }, 0.3, 0.3))).toBe(true);
    expect(inside(growRect({ x: 0, y: 0, w: 0.9, h: 0.9 }, 0.5, 0.5, null))).toBe(true);
  });
  it("rotating four times returns the same crop", () => {
    let e: PhotoEdits = { ...DEFAULT_EDITS, crop: { x: 0.1, y: 0.2, w: 0.3, h: 0.4, aspect: "free" } };
    for (let i = 0; i < 4; i++) e = rotateEdits(e, 1);
    expect(e.rotate).toBe(0);
    expect(e.crop?.x).toBeCloseTo(0.1);
    expect(e.crop?.y).toBeCloseTo(0.2);
    expect(e.crop?.w).toBeCloseTo(0.3);
  });
  it("flip twice is the identity and edits validate against the contract", () => {
    let e: PhotoEdits = { ...DEFAULT_EDITS, crop: { x: 0.1, y: 0.2, w: 0.3, h: 0.4, aspect: "4:3" } };
    e = flipEdits(flipEdits(e, "h"), "h");
    expect(e.crop?.x).toBeCloseTo(0.1);
    expect(PhotoEdits.safeParse(normalizeEdits({ ...e, brightness: 10 })).success).toBe(true);
  });
  it("identity and full-frame crops normalise to null", () => {
    expect(normalizeEdits(DEFAULT_EDITS)).toBeNull();
    expect(normalizeEdits({ ...DEFAULT_EDITS, crop: { x: 0, y: 0, w: 1, h: 1, aspect: "free" } })).toBeNull();
  });
});
