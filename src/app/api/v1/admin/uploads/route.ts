import { created, list } from "@/server/http/envelope";
import { UploadForm, UploadsQuery, UPLOAD_LIMITS } from "@/contract";
import { readMultipart } from "@/server/http/multipart";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

/** History of uploads in the viewer's scope, newest first. */
export const GET = adminRoute({ query: UploadsQuery, permission: "uploads.manage" }, async ({ actor, query }) =>
  list(await services().portal.uploads.list(actor, query)),
);

/** Multipart `file` + `sevaType` (+ `samithi`) → 201 `UploadPreview`. Nothing is loaded until confirm. */
export const POST = adminRoute({ permission: "uploads.manage" }, async ({ actor, req, locale }) => {
  const { file, fields } = await readMultipart(req, UploadForm, { maxBytes: UPLOAD_LIMITS.sheetBytes, locale });
  return created(await services().portal.uploads.create(actor, file, fields));
});
