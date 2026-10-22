import { ImpactQuery } from "@/contract";
import { ok } from "@/server/http/envelope";
import { notFound } from "@/server/http/errors";
import { route } from "@/server/http/route";
import { services } from "@/server/services";

export const GET = route({ query: ImpactQuery }, async ({ query }) => {
  const impact = await services().impact.get(query);
  if (!impact) throw notFound();
  return ok(impact);
});
