// Printable A4 QR poster for a form link (spec 26 "printable at A4").
// English only for now: the standard PDF fonts have no Devanagari (see report).
import { PDFDocument, type PDFFont, rgb, StandardFonts } from "pdf-lib";
import QRCode from "qrcode";
import { embedEmblem } from "./letterhead";

export interface PosterInput {
  url: string;
  heading: string;
  title: string;
  when: string;
  venue: string;
  instructions: string;
  footer: string;
}

const A4: [number, number] = [595.28, 841.89];
const MARGIN = 56;
const INK = rgb(0.13, 0.16, 0.22);
const MUTED = rgb(0.38, 0.42, 0.5);
const BLUE = rgb(0.11, 0.3, 0.55);

/** Keeps characters the standard (WinAnsi) fonts can draw. */
export const winAnsi = (s: string) => s.replace(/[^\x20-\x7E -ÿ–—‘’“”•…]/g, "").replace(/\s+/g, " ").trim();

function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const words = winAnsi(text).split(" ").filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(next, size) <= width || !line) line = next;
    else {
      lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export async function qrPosterPdf(p: PosterInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(winAnsi(`${p.heading} – ${p.title}`));
  doc.setProducer("SSSSO Delhi NCR portal");
  const page = doc.addPage(A4);
  const [w, h] = A4;
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const width = w - MARGIN * 2;
  let y = h - MARGIN;

  const lines = (text: string, font: PDFFont, size: number, color = INK, gap = 6) => {
    for (const l of wrap(text, font, size, width)) {
      y -= size;
      page.drawText(l, { x: MARGIN + (width - font.widthOfTextAtSize(l, size)) / 2, y, size, font, color });
      y -= gap;
    }
  };

  page.drawImage(await embedEmblem(doc), { x: (w - 56) / 2, y: y - 56, width: 56, height: 56 });
  y -= 64;
  lines("Sri Sathya Sai Seva Organisation · Delhi NCR", regular, 11, MUTED, 18);
  page.drawLine({ start: { x: MARGIN, y }, end: { x: w - MARGIN, y }, thickness: 0.75, color: rgb(0.83, 0.69, 0.22) });
  y -= 28;
  lines(p.heading, bold, 16, BLUE, 12);
  lines(p.title, bold, 26, INK, 10);
  lines(p.when, regular, 14, INK, 4);
  lines(p.venue, regular, 13, MUTED, 20);

  const qr = QRCode.create(p.url, { errorCorrectionLevel: "M" });
  const n = qr.modules.size;
  const quiet = 4;
  const side = Math.min(320, y - 200);
  const cell = side / (n + quiet * 2);
  const x0 = (w - side) / 2;
  const y0 = y - side;
  page.drawRectangle({ x: x0, y: y0, width: side, height: side, color: rgb(1, 1, 1), borderColor: rgb(0.85, 0.87, 0.9), borderWidth: 1 });
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (!qr.modules.data[r * n + c]) continue;
      page.drawRectangle({ x: x0 + (c + quiet) * cell, y: y0 + side - (r + quiet + 1) * cell, width: cell, height: cell, color: INK });
    }
  }
  y = y0 - 30;
  lines(p.instructions, regular, 14, INK, 8);
  y -= 10;
  lines(p.footer, regular, 10, MUTED, 4);
  return doc.save();
}
