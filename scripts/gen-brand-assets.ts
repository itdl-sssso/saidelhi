/**
 * Regenerates static brand assets from `public/brand/sarva-dharma-emblem.jpg` (the only source of truth).
 *   pnpm exec tsx scripts/gen-brand-assets.ts
 * Writes: public/brand/emblem-{512,1024}.png (transparent), emblem-white-512.png (one-colour, for dark backgrounds),
 * public/brand/icons/*.png (PWA, maskable, apple), src/app/icon.png + apple-icon.png, public/brand/whatsapp/*.png.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";


const ROOT = process.cwd();
const SRC = join(ROOT, "public/brand/sarva-dharma-emblem.jpg");
const BRAND = join(ROOT, "public/brand");
// Tokens (design-system/tokens/colors.css)
const CREAM = "#FAFAFA";
const BLUE50 = "#EAF8FE";
const BLUE700 = "#164A5F";
const GOLD300 = "#E8B84E";

mkdirSync(join(BRAND, "icons"), { recursive: true });
mkdirSync(join(BRAND, "whatsapp"), { recursive: true });

/** 2x lanczos upscale, flood the near-white background from the border, colour-to-alpha on the anti-aliased rim. */
async function transparentEmblem(): Promise<{ data: Buffer; size: number }> {
  const size = 1024;
  const { data } = await sharp(SRC).resize(size, size, { kernel: "lanczos3" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const n = size * size;
  const isBg = new Uint8Array(n);
  const stack: number[] = [];
  const white = (i: number) => data[i * 3] > 244 && data[i * 3 + 1] > 244 && data[i * 3 + 2] > 244;
  const push = (i: number) => {
    if (!isBg[i] && white(i)) {
      isBg[i] = 1;
      stack.push(i);
    }
  };
  for (let x = 0; x < size; x++) {
    push(x);
    push((size - 1) * size + x);
  }
  for (let y = 0; y < size; y++) {
    push(y * size);
    push(y * size + size - 1);
  }
  while (stack.length) {
    const i = stack.pop()!;
    const x = i % size;
    if (x > 0) push(i - 1);
    if (x < size - 1) push(i + 1);
    if (i >= size) push(i - size);
    if (i < n - size) push(i + size);
  }
  // Rim = pixels within RIM px of the background: un-matte against white.
  const RIM = 4;
  const dist = new Uint8Array(n).fill(255);
  let frontier: number[] = [];
  for (let i = 0; i < n; i++) if (isBg[i]) (dist[i] = 0), frontier.push(i);
  for (let d = 1; d <= RIM; d++) {
    const next: number[] = [];
    for (const i of frontier) {
      const x = i % size;
      const nb = [x > 0 ? i - 1 : -1, x < size - 1 ? i + 1 : -1, i >= size ? i - size : -1, i < n - size ? i + size : -1];
      for (const j of nb) if (j >= 0 && dist[j] === 255) (dist[j] = d), next.push(j);
    }
    frontier = next;
  }
  const out = Buffer.alloc(n * 4);
  for (let i = 0; i < n; i++) {
    const r = data[i * 3];
    const g = data[i * 3 + 1];
    const b = data[i * 3 + 2];
    let a = 255;
    let [R, G, B] = [r, g, b];
    if (isBg[i]) a = 0;
    else if (dist[i] <= RIM) {
      const m = Math.min(r, g, b); // distance from white along the weakest channel
      const alpha = Math.min(1, Math.max(0, (255 - m) / 255 / 0.85));
      a = Math.round(alpha * 255);
      if (alpha > 0.02) {
        R = Math.max(0, Math.min(255, Math.round((r - 255 * (1 - alpha)) / alpha)));
        G = Math.max(0, Math.min(255, Math.round((g - 255 * (1 - alpha)) / alpha)));
        B = Math.max(0, Math.min(255, Math.round((b - 255 * (1 - alpha)) / alpha)));
      }
    }
    out[i * 4] = R;
    out[i * 4 + 1] = G;
    out[i * 4 + 2] = B;
    out[i * 4 + 3] = a;
  }
  return { data: out, size };
}

/** One-colour white: dark ink (outline, lamp, flame cup) and mid-tone fills become white, light areas drop out. */
function whiteVersion(rgba: Buffer, size: number): Buffer {
  const out = Buffer.alloc(size * size * 4, 255);
  for (let i = 0; i < size * size; i++) {
    const a = rgba[i * 4 + 3] / 255;
    const luma = (0.299 * rgba[i * 4] + 0.587 * rgba[i * 4 + 1] + 0.114 * rgba[i * 4 + 2]) / 255;
    const ink = Math.min(1, Math.max(0, (0.97 - luma) / 0.55)); // 0 for light, 1 for dark
    out[i * 4 + 3] = Math.round(a * (0.08 + 0.92 * Math.pow(ink, 0.7)) * 255);
  }
  return out;
}

async function main() {
  const { data, size } = await transparentEmblem();
  const emblem = () => sharp(data, { raw: { width: size, height: size, channels: 4 } });
  const png = (img: sharp.Sharp) => img.png({ compressionLevel: 9, palette: false }).toBuffer();
  const emblemAt = async (px: number) => png(emblem().resize(px, px, { kernel: "lanczos3" }));
  const write = (p: string, b: Buffer) => writeFileSync(p, b);

  write(join(BRAND, "emblem-1024.png"), await emblemAt(1024));
  write(join(BRAND, "emblem-512.png"), await emblemAt(512));
  const white = whiteVersion(data, size);
  write(join(BRAND, "emblem-white-512.png"), await png(sharp(white, { raw: { width: size, height: size, channels: 4 } }).resize(512, 512)));

  // Icons: emblem on cream (the emblem needs a light ground). Maskable keeps it inside the 80% safe circle.
  const onSquare = async (px: number, scale: number, bg: string) => {
    const e = Math.round(px * scale);
    const inner = await emblemAt(e);
    return png(sharp({ create: { width: px, height: px, channels: 4, background: bg } }).composite([{ input: inner, left: Math.round((px - e) / 2), top: Math.round((px - e) / 2) }]));
  };
  write(join(BRAND, "icons/icon-192.png"), await onSquare(192, 0.92, CREAM));
  write(join(BRAND, "icons/icon-512.png"), await onSquare(512, 0.92, CREAM));
  write(join(BRAND, "icons/icon-maskable-512.png"), await onSquare(512, 0.62, CREAM));
  write(join(ROOT, "src/app/apple-icon.png"), await onSquare(180, 0.86, "#FFFFFF"));
  write(join(ROOT, "src/app/icon.png"), await onSquare(128, 0.96, "#00000000"));

  // WhatsApp: profile 640x640 (circle crop by WhatsApp, so keep inside the safe area), template header 800x418.
  write(join(BRAND, "whatsapp/profile-640.png"), await onSquare(640, 0.72, CREAM));
  const W = 800;
  const H = 418;
  const bg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${CREAM}"/><stop offset="1" stop-color="${BLUE50}"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#g)"/><rect x="0" y="${H - 8}" width="${W}" height="8" fill="${GOLD300}"/><rect x="0" y="0" width="${W}" height="${H - 8}" fill="none"/></svg>`,
  );
  const textSvg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><style>.o{font:700 34px 'Noto Sans','DejaVu Sans',sans-serif;fill:${BLUE700}}.r{font:400 28px 'Noto Sans','DejaVu Sans',sans-serif;fill:#4B5563;letter-spacing:6px}</style><text class="o" x="330" y="165">Sri Sathya Sai</text><text class="o" x="330" y="209">Seva Organisation</text><rect x="330" y="232" width="64" height="4" fill="${GOLD300}"/><text class="r" x="330" y="283">DELHI NCR</text></svg>`,
  );
  const hdrEmblem = await emblemAt(300);
  write(
    join(BRAND, "whatsapp/template-header-800x418.png"),
    await png(sharp(bg).composite([{ input: hdrEmblem, left: 20, top: 59 }, { input: textSvg, left: 0, top: 0 }])),
  );
  console.log("brand assets written");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
