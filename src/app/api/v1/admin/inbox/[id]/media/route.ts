import { createReadStream } from "node:fs";
import { realpath, stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { InboxIdParams, InboxMediaQuery } from "@/contract";
import { env } from "@/server/env";
import { resolveUnder } from "@/server/files";
import { ApiError } from "@/server/http/errors";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

/** Source photo/PDF of an inbox item for authorised reviewers; every view is audited. */
export const GET = adminRoute({ params: InboxIdParams, query: InboxMediaQuery, permission: "inbox.review" }, async ({ actor, params, query }) => {
  const m = await services().wa.inbox.openMedia(actor, params.id, query.m ?? null);
  const root = path.resolve(env().MEDIA_PRIVATE_ROOT);
  const file = resolveUnder(root, m.path.split("/"));
  if (!file) throw new ApiError("NOT_FOUND");
  try {
    const [real, realRoot] = await Promise.all([realpath(file), realpath(root)]);
    if (!real.startsWith(realRoot + path.sep) || !(await stat(real)).isFile()) throw new ApiError("NOT_FOUND");
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError("NOT_FOUND");
  }
  const name = m.name.replace(/["\\\r\n]/g, "_");
  return new Response(Readable.toWeb(createReadStream(file)) as ReadableStream<Uint8Array>, {
    status: 200,
    headers: {
      "content-type": m.mime,
      "content-disposition": `inline; filename="${name}"`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
      "content-security-policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
    },
  });
});
