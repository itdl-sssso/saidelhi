import { createReadStream } from "node:fs";
import { realpath, stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import type { NextRequest } from "next/server";
import { env } from "@/server/env";
import { mediaContentType, resolveUnder } from "@/server/files";

const CACHE = "public, max-age=31536000, stale-while-revalidate=86400";

const notFound = () => new Response("Not found", { status: 404, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });

function decode(seg: string): string | null {
  try {
    return seg.includes("%") ? decodeURIComponent(seg) : seg;
  } catch {
    return null;
  }
}

async function serve(req: NextRequest, segments: readonly string[], head: boolean): Promise<Response> {
  const decoded = segments.map(decode);
  if (decoded.some((s) => s === null)) return notFound();
  const root = path.resolve(env().MEDIA_ROOT);
  const file = resolveUnder(root, decoded as string[]);
  const type = file ? mediaContentType(file) : null;
  if (!file || !type) return notFound();

  let info;
  try {
    // realpath: a symlink inside the media dir must not lead outside it.
    const [real, realRoot] = await Promise.all([realpath(file), realpath(root)]);
    if (!real.startsWith(realRoot + path.sep)) return notFound();
    info = await stat(real);
  } catch {
    return notFound();
  }
  if (!info.isFile()) return notFound();

  const etag = `W/"${info.size.toString(16)}-${Math.floor(info.mtimeMs).toString(16)}"`;
  const headers: Record<string, string> = {
    "content-type": type,
    "cache-control": CACHE,
    etag,
    "last-modified": info.mtime.toUTCString(),
    "x-content-type-options": "nosniff",
  };
  // SVGs can carry script; never render them as a document on our origin.
  if (type === "image/svg+xml") headers["content-security-policy"] = "default-src 'none'; style-src 'unsafe-inline'; sandbox";
  if (req.headers.get("if-none-match") === etag) return new Response(null, { status: 304, headers });
  headers["content-length"] = String(info.size);
  if (head) return new Response(null, { status: 200, headers });
  const body = Readable.toWeb(createReadStream(file)) as ReadableStream<Uint8Array>;
  return new Response(body, { status: 200, headers });
}

/** Legacy Django media (MEDIA_ROOT), e.g. /media/postsmedia/x.png. Not localised (excluded in src/proxy.ts). */
export async function GET(req: NextRequest, ctx: RouteContext<"/media/[...path]">) {
  return serve(req, (await ctx.params).path, false);
}

export async function HEAD(req: NextRequest, ctx: RouteContext<"/media/[...path]">) {
  return serve(req, (await ctx.params).path, true);
}
