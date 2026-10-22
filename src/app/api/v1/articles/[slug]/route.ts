import { z } from "zod";
import { ok } from "@/server/http/envelope";
import { notFound } from "@/server/http/errors";
import { route } from "@/server/http/route";
import { services } from "@/server/services";

// Legacy Django slugs may contain underscores or capitals, so accept any short slug.
const Params = z.object({ slug: z.string().min(1).max(80) });

export const GET = route({ params: Params }, async ({ params }) => {
  const article = await services().articles.bySlug(params.slug);
  if (!article) throw notFound();
  return ok(article);
});
