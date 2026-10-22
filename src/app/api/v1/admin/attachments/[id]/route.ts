import { createReadStream } from "node:fs";
import { realpath, stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { IdParams } from "@/contract";
import { env } from "@/server/env";
import { ApiError } from "@/server/http/errors";
import { resolveUnder } from "@/server/files";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

/** Private files (register scans) for authorised viewers only; every view is audited. */
export const GET = adminRoute({ params: IdParams, permission: "attachments.read" }, async ({ actor, params }) => {
  const a = await services().portal.attachments.open(actor, params.id);
  const root = path.resolve(env().MEDIA_PRIVATE_ROOT);
  const file = resolveUnder(root, a.path.split("/"));
  if (!file) throw new ApiError("NOT_FOUND");
  try {
    const [real, realRoot] = await Promise.all([realpath(file), realpath(root)]);
    if (!real.startsWith(realRoot + path.sep) || !(await stat(real)).isFile()) throw new ApiError("NOT_FOUND");
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError("NOT_FOUND");
  }
  const body = Readable.toWeb(createReadStream(file)) as ReadableStream<Uint8Array>;
  const name = a.originalName.replace(/["\\\r\n]/g, "_");
  return new Response(body, {
    status: 200,
    headers: {
      "content-type": a.mime,
      "content-length": String(a.size),
      "content-disposition": `inline; filename="${name}"`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
      "content-security-policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
    },
  });
});
