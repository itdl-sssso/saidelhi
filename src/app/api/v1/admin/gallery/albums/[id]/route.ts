import { GalleryAlbumPatch, IdParams } from "@/contract";
import { ok } from "@/server/http/envelope";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

export const GET = adminRoute({ params: IdParams }, async ({ actor, params }) => ok(await services().portal.gallery.album(actor, params.id)));

/** `version` required. Publishing / cover / order need `gallery.review`; publishing needs ≥1 approved photo (422 `fields.status`). */
export const PATCH = adminRoute({ params: IdParams, body: GalleryAlbumPatch }, async ({ actor, params, body }) => ok(await services().portal.gallery.patchAlbum(actor, params.id, body)));
