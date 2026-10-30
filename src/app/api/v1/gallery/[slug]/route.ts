import { z } from "zod";
import { ok } from "@/server/http/envelope";
import { notFound } from "@/server/http/errors";
import { route } from "@/server/http/route";
import { services } from "@/server/services";

const Params = z.object({ slug: z.string().min(1).max(120) });

export const GET = route({ params: Params }, async ({ params }) => {
  const album = await services().gallery.album(params.slug);
  if (!album) throw notFound();
  return ok(album);
});
