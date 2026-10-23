import { IdParams, PhotoUploadForm, UPLOAD_LIMITS } from "@/contract";
import { created } from "@/server/http/envelope";
import { readMultipart } from "@/server/http/multipart";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

/** Multipart `file` (JPG/PNG/WebP, ≤8 MB) + `alt` → 201 `Media`; then PATCH the centre's `photos`. */
export const POST = adminRoute({ params: IdParams, permission: "centres.manage" }, async ({ actor, params, req, locale }) => {
  const { file, fields } = await readMultipart(req, PhotoUploadForm, { maxBytes: UPLOAD_LIMITS.photoBytes, locale });
  return created(await services().portal.centres.uploadPhoto(actor, params.id, file, fields));
});
