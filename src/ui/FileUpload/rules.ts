export type FileLimits = { maxBytes: number; mimes: readonly string[] };

export type FileProblem = "type" | "size" | "empty";

/** Client-side pre-check against the server's attachment limits (the server sniffs bytes again). */
export function checkFile(file: { type: string; size: number }, limits: FileLimits): FileProblem | null {
  if (file.size === 0) return "empty";
  if (!limits.mimes.includes(file.type)) return "type";
  if (file.size > limits.maxBytes) return "size";
  return null;
}

/** "2.4 MB", "820 KB". */
export function formatBytes(n: number): string {
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(n >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
  return `${Math.max(1, Math.round(n / 1024))} KB`;
}

const EXT: Record<string, string> = { "image/jpeg": "JPG", "image/png": "PNG", "image/webp": "WebP", "application/pdf": "PDF" };

/** "JPG, PNG, WebP or PDF" style list for the hint (joined by the caller's "or"). */
export const mimeLabels = (mimes: readonly string[]) => mimes.map((m) => EXT[m] ?? m.split("/")[1]?.toUpperCase() ?? m);
