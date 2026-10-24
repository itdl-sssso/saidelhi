import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { PDFDocument, PDFImage } from "pdf-lib";

let bytes: Promise<Buffer> | undefined;

/** Transparent Sarva Dharma emblem (public/brand/emblem-512.png) embedded in a PDF. */
export async function embedEmblem(doc: PDFDocument): Promise<PDFImage> {
  bytes ??= readFile(join(process.cwd(), "public/brand/emblem-512.png"));
  return doc.embedPng(await bytes);
}
