import { GalleryPhotoApproveBody, IdParams } from "@/contract";
import { ok } from "@/server/http/envelope";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

/** Publishes a stripped JPEG to public media (visible once its album is published). */
export const POST = adminRoute({ params: IdParams, body: GalleryPhotoApproveBody, permission: "gallery.review" }, async ({ actor, params, body }) =>
  ok(await services().portal.gallery.approve(actor, params.id, body)),
);
