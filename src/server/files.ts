// Media files: legacy public media under MEDIA_ROOT, private uploads under MEDIA_PRIVATE_ROOT.
import { mkdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".bmp": "image/bmp",
  ".pdf": "application/pdf",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mp3": "audio/mpeg",
};

/** Content type for a public media file; null = not served. */
export const mediaContentType = (file: string): string | null => CONTENT_TYPES[path.extname(file).toLowerCase()] ?? null;

/**
 * Joins URL segments under `root`, refusing traversal, absolute segments, NUL
 * bytes and dotfiles. Returns null for anything that would escape the root.
 */
export function resolveUnder(root: string, segments: readonly string[]): string | null {
  if (segments.length === 0) return null;
  for (const s of segments) {
    if (!s || s === "." || s === ".." || s.startsWith(".") || /[\0\\/]/.test(s) || path.isAbsolute(s)) return null;
  }
  const base = path.resolve(root);
  const target = path.resolve(base, ...segments);
  return target.startsWith(base + path.sep) ? target : null;
}

export interface PrivateStorage {
  /** Writes bytes at a path relative to the private root; never overwrites. */
  put(relPath: string, bytes: Uint8Array): Promise<void>;
  /** Reads a stored file; null when it does not exist. */
  get(relPath: string): Promise<Uint8Array | null>;
  /** Cheap existence check (falls back to `get` when absent). */
  exists?(relPath: string): Promise<boolean>;
  /** Removes a stored file (retention purge); false when it was not there. */
  delete?(relPath: string): Promise<boolean>;
}

export class DiskStorage implements PrivateStorage {
  constructor(private readonly root: string) {}

  async put(relPath: string, bytes: Uint8Array): Promise<void> {
    const target = resolveUnder(this.root, relPath.split("/"));
    if (!target) throw new Error("Invalid storage path");
    await mkdir(path.dirname(target), { recursive: true, mode: 0o700 });
    await writeFile(target, bytes, { flag: "wx", mode: 0o600 });
  }

  async delete(relPath: string): Promise<boolean> {
    const target = resolveUnder(this.root, relPath.split("/"));
    if (!target) return false;
    try {
      await unlink(target);
      return true;
    } catch {
      return false;
    }
  }

  async exists(relPath: string): Promise<boolean> {
    const target = resolveUnder(this.root, relPath.split("/"));
    if (!target) return false;
    try {
      return (await stat(target)).isFile();
    } catch {
      return false;
    }
  }

  async get(relPath: string): Promise<Uint8Array | null> {
    const target = resolveUnder(this.root, relPath.split("/"));
    if (!target) return null;
    try {
      return new Uint8Array(await readFile(target));
    } catch {
      return null;
    }
  }
}

/** Sniffs the real type from magic bytes (client-supplied types are ignored). */
export function sniffMime(b: Uint8Array): { mime: string; ext: string } | null {
  const starts = (sig: readonly number[], at = 0) => sig.every((v, i) => b[at + i] === v);
  if (starts([0xff, 0xd8, 0xff])) return { mime: "image/jpeg", ext: "jpg" };
  if (starts([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return { mime: "image/png", ext: "png" };
  if (starts([0x52, 0x49, 0x46, 0x46]) && starts([0x57, 0x45, 0x42, 0x50], 8)) return { mime: "image/webp", ext: "webp" };
  if (starts([0x25, 0x50, 0x44, 0x46, 0x2d])) return { mime: "application/pdf", ext: "pdf" };
  return null;
}
