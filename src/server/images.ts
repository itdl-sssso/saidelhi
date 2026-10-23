// Image type (by magic bytes) and pixel size without a decoding library.
// EXIF is not stripped (no image library is installed): TODO(M7) re-encode via sharp if added.

export interface ImageInfo {
  mime: "image/jpeg" | "image/png" | "image/webp";
  ext: "jpg" | "png" | "webp";
  width: number | null;
  height: number | null;
}

const u16be = (b: Uint8Array, i: number) => (b[i] << 8) | b[i + 1];
const u32be = (b: Uint8Array, i: number) => ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0;
const u24le = (b: Uint8Array, i: number) => b[i] | (b[i + 1] << 8) | (b[i + 2] << 16);

export function sniffImage(b: Uint8Array): ImageInfo | null {
  if (b.length > 24 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) {
    return { mime: "image/png", ext: "png", width: u32be(b, 16), height: u32be(b, 20) };
  }
  if (b.length > 4 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) {
        i++;
        continue;
      }
      const marker = b[i + 1];
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { mime: "image/jpeg", ext: "jpg", height: u16be(b, i + 5), width: u16be(b, i + 7) };
      }
      i += 2 + u16be(b, i + 2);
    }
    return { mime: "image/jpeg", ext: "jpg", width: null, height: null };
  }
  const tag = (at: number, s: string) => [...s].every((c, k) => b[at + k] === c.charCodeAt(0));
  if (b.length > 30 && tag(0, "RIFF") && tag(8, "WEBP")) {
    if (tag(12, "VP8X")) return { mime: "image/webp", ext: "webp", width: u24le(b, 24) + 1, height: u24le(b, 27) + 1 };
    return { mime: "image/webp", ext: "webp", width: null, height: null };
  }
  return null;
}
