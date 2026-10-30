import { GalleryPhotoRejectBody, IdParams } from "@/contract";
import { ok } from "@/server/http/envelope";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

/** Hides the photo and removes its public file. */
export const POST = adminRoute({ params: IdParams, body: GalleryPhotoRejectBody, permission: "gallery.review" }, async ({ actor, params, body }) =>
  ok(await services().portal.gallery.reject(actor, params.id, body)),
);
