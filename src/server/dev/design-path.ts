import path from "node:path";

/** Root served read-only by /api/dev/design. */
export const designRoot = () => path.resolve(process.cwd(), "docs", "design");

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".jsx": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".glb": "model/gltf-binary",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
};

export const designContentType = (file: string) => TYPES[path.extname(file).toLowerCase()] ?? "application/octet-stream";

/**
 * Resolves URL segments to a path strictly inside `root`. Returns null on traversal, NUL bytes, dotfiles,
 * separators inside a segment or empty input. The caller still checks that the file exists.
 */
export function resolveUnder(root: string, segments: string[]): string | null {
  if (!segments.length) return null;
  const decoded: string[] = [];
  for (const raw of segments) {
    let seg: string;
    try {
      seg = decodeURIComponent(raw);
    } catch {
      return null;
    }
    if (!seg || seg.startsWith(".") || /[\\/\0]/.test(seg)) return null;
    decoded.push(seg);
  }
  const full = path.resolve(root, ...decoded);
  const rel = path.relative(root, full);
  if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) return null;
  return full;
}
