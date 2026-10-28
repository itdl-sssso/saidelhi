import { AdminGalleryAlbumsQuery, GalleryAlbumCreate } from "@/contract";
import { created, list } from "@/server/http/envelope";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

export const GET = adminRoute({ query: AdminGalleryAlbumsQuery }, async ({ actor, query }) => list(await services().portal.gallery.albums(actor, query)));

/** With `eventId` an existing album for that event is returned (201 either way). */
export const POST = adminRoute({ body: GalleryAlbumCreate, permission: "gallery.upload" }, async ({ actor, body }) =>
  created(await services().portal.gallery.createAlbum(actor, body)),
);
