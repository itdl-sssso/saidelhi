import { GalleryQuery } from "@/contract";
import { okBody } from "@/server/http/envelope";
import { route } from "@/server/http/route";
import { services } from "@/server/services";

/** `{ data, meta, facets }`: list envelope plus the unfiltered filter options. */
export const GET = route({ query: GalleryQuery }, async ({ query }) => {
  const { data, meta, facets } = await services().gallery.albums(query);
  return Response.json({ ...okBody(data), meta, facets });
});
