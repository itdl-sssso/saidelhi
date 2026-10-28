import { GalleryPhotoPatch, IdParams } from "@/contract";
import { ok } from "@/server/http/envelope";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

export const GET = adminRoute({ params: IdParams }, async ({ actor, params }) => ok(await services().portal.gallery.photo(actor, params.id)));

/** `version` required (409 when stale). Captions, alt, album, `setCover`. */
export const PATCH = adminRoute({ params: IdParams, body: GalleryPhotoPatch, permission: "gallery.review" }, async ({ actor, params, body }) =>
  ok(await services().portal.gallery.patchPhoto(actor, params.id, body)),
);
