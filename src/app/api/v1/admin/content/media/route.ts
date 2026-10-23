import { ContentMediaForm, UPLOAD_LIMITS } from "@/contract";
import { created } from "@/server/http/envelope";
import { readMultipart } from "@/server/http/multipart";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

/** Multipart `file` (JPG/PNG/WebP, ≤8 MB) + `alt` → 201 public `Media` under /media/content/. */
export const POST = adminRoute({ permission: "content.edit" }, async ({ actor, req, locale }) => {
  const { file, fields } = await readMultipart(req, ContentMediaForm, { maxBytes: UPLOAD_LIMITS.photoBytes, locale });
  return created(await services().portal.content.uploadMedia(actor, file, fields));
});
