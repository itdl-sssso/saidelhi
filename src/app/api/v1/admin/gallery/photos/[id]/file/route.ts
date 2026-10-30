import { GalleryFileQuery, IdParams } from "@/contract";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

/** Stripped JPEG for authorised viewers (viewing the original is audited). Never cached. */
export const GET = adminRoute({ params: IdParams, query: GalleryFileQuery }, async ({ actor, params, query }) => {
  const f = await services().portal.gallery.file(actor, params.id, query.variant);
  return new Response(Buffer.from(f.bytes), {
    status: 200,
    headers: {
      "content-type": f.mime,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
      "content-security-policy": "default-src 'none'; img-src 'self'; sandbox",
    },
  });
});
