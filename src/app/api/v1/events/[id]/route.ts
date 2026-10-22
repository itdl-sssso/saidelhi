import { IdParams } from "@/contract";
import { ok } from "@/server/http/envelope";
import { notFound } from "@/server/http/errors";
import { route } from "@/server/http/route";
import { services } from "@/server/services";

export const GET = route({ params: IdParams }, async ({ params }) => {
  const event = await services().events.byId(params.id);
  if (!event) throw notFound();
  return ok(event);
});
