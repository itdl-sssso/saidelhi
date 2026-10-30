import { AdminGalleryPhotosQuery, GALLERY_LIMITS, GalleryUploadForm } from "@/contract";
import { created, list } from "@/server/http/envelope";
import { readMultipart } from "@/server/http/multipart";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

/** Photos in the viewer's scope by status (`meta.counts` {pending, approved, rejected}); `albumId=none` = not in an album. */
export const GET = adminRoute({ query: AdminGalleryPhotosQuery }, async ({ actor, query }) => list(await services().portal.gallery.photos(actor, query)));

/** Multipart `file` (JPG/PNG/WebP, ≤10 MB) + `albumId?` + `caption?` → 201 pending photo. */
export const POST = adminRoute({ permission: "gallery.upload" }, async ({ actor, req, locale }) => {
  const { file, fields } = await readMultipart(req, GalleryUploadForm, { maxBytes: GALLERY_LIMITS.bytes, locale });
  return created(await services().portal.gallery.upload(actor, file, fields));
});
