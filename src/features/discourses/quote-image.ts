// Client-only: draws the 1080x1080 brand quote card (design: QuoteImage in b6-discourses.jsx) on a canvas.
// Devanagari needs its webfont loaded before drawing, so fonts are resolved from the live page and awaited.

export type QuoteImageInput = {
  text: string;
  lang: "en" | "hi";
  attribution: string;
  /** Source line, e.g. "Sathya Sai Speaks Vol 39, Ch 13 · 22 November 2006". */
  source: string;
  footer: string;
};

const SIZE = 1080;
const PAD = 96;

function cssVar(name: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

/** Computed font-family of a probe element, so next/font's hashed family names resolve. */
function resolveFamily(lang: string, varName: string, fallback: string): string {
  const probe = document.createElement("span");
  probe.lang = lang;
  probe.style.cssText = `position:absolute;visibility:hidden;font-family:var(${varName}, ${fallback})`;
  document.body.appendChild(probe);
  const fam = getComputedStyle(probe).fontFamily || fallback;
  probe.remove();
  return fam;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const para of text.split("\n")) {
    let line = "";
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(next).width > maxWidth) {
        lines.push(line);
        line = word;
      } else line = next;
    }
    if (line) lines.push(line);
  }
  return lines;
}

export async function renderQuoteImage(input: QuoteImageInput): Promise<Blob> {
  const serif = resolveFamily(input.lang, "--font-serif-display", "Georgia, serif");
  const sans = resolveFamily(input.lang, "--font-sans-body", "system-ui, sans-serif");
  const hi = input.lang === "hi";
  const all = `${input.text}${input.attribution}${input.source}${input.footer}`;
  // A font that fails to load must not block the card: the canvas falls back to the next family.
  await Promise.allSettled([
    document.fonts.load(`${hi ? "" : "italic "}48px ${serif}`, all),
    document.fonts.load(`500 28px ${sans}`, all),
  ]);

  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no canvas");

  const warm = cssVar("--surface-warm", "#FFF7F0");
  const heading = cssVar("--slate-800", "#1F2937");
  const accent = cssVar("--pink-700", "#7A2C47");
  const muted = cssVar("--slate-700", "#374151");
  const gold = cssVar("--dharma-rule", "#E8B84E");

  ctx.fillStyle = warm;
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.fillStyle = gold;
  ctx.fillRect(0, 0, SIZE, 14);

  // Quote mark
  ctx.fillStyle = accent;
  ctx.globalAlpha = 0.35;
  ctx.font = `120px ${cssVar("--font-playfair", "Georgia")}, Georgia, serif`;
  ctx.textBaseline = "alphabetic";
  ctx.fillText("“", PAD, PAD + 120);
  ctx.globalAlpha = 1;

  // Fit quote: shrink until it fits in the body box.
  const top = 270;
  const bottom = 800;
  let size = hi ? 60 : 64;
  let lines: string[] = [];
  let lh = 0;
  for (; size >= 32; size -= 2) {
    ctx.font = `${hi ? "" : "italic "}${size}px ${serif}`;
    lines = wrap(ctx, input.text, SIZE - PAD * 2);
    lh = size * (hi ? 1.55 : 1.35);
    if (lines.length * lh <= bottom - top) break;
  }
  ctx.fillStyle = heading;
  lines.forEach((l, i) => ctx.fillText(l, PAD, top + size + i * lh));

  const y0 = Math.min(top + size + lines.length * lh + 30, 860);
  ctx.fillStyle = accent;
  ctx.font = `500 34px ${sans}`;
  ctx.fillText(`— ${input.attribution}`, PAD, y0);
  ctx.fillStyle = muted;
  ctx.font = `26px ${sans}`;
  const srcLines = wrap(ctx, input.source, SIZE - PAD * 2);
  srcLines.slice(0, 2).forEach((l, i) => ctx.fillText(l, PAD, y0 + 46 + i * 34));

  // Footer
  ctx.fillStyle = gold;
  ctx.fillRect(PAD, SIZE - 120, SIZE - PAD * 2, 3);
  ctx.fillStyle = muted;
  ctx.font = `500 26px ${sans}`;
  ctx.fillText(input.footer, PAD, SIZE - 64);

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob"))), "image/png"));
}

/** Share the image with the OS sheet when files are supported; otherwise download it. */
export async function shareOrDownload(blob: Blob, filename: string, text: string): Promise<"shared" | "saved"> {
  const file = new File([blob], filename, { type: "image/png" });
  if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text });
      return "shared";
    } catch (e) {
      if ((e as DOMException).name === "AbortError") return "shared";
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return "saved";
}
