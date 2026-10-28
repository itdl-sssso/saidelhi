import { GalleryPhotoBulkBody } from "@/contract";
import { ok } from "@/server/http/envelope";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

/** Approve or reject many photos; per-photo failures are reported, not thrown. */
export const POST = adminRoute({ body: GalleryPhotoBulkBody, permission: "gallery.review" }, async ({ actor, body }) => ok(await services().portal.gallery.bulk(actor, body)));
