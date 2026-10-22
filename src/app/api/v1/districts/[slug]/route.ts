import { SlugParams } from "@/contract";
import { ok } from "@/server/http/envelope";
import { notFound } from "@/server/http/errors";
import { route } from "@/server/http/route";
import { services } from "@/server/services";

export const GET = route({ params: SlugParams }, async ({ params }) => {
  const district = await services().districts.bySlug(params.slug);
  if (!district) throw notFound();
  return ok(district);
});
