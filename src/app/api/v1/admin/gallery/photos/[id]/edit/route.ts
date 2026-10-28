import { GalleryPhotoEditBody, IdParams } from "@/contract";
import { ok } from "@/server/http/envelope";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

/** Renders a new derived file from the original (`edits: null` = revert). Approved photos are republished. */
export const POST = adminRoute({ params: IdParams, body: GalleryPhotoEditBody, permission: "gallery.review" }, async ({ actor, params, body }) =>
  ok(await services().portal.gallery.editPhoto(actor, params.id, body)),
);
