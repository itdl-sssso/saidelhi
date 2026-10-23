import { RedirectQuery } from "@/contract";
import { ok } from "@/server/http/envelope";
import { notFound } from "@/server/http/errors";
import { route } from "@/server/http/route";
import { services } from "@/server/services";

export const GET = route({ query: RedirectQuery }, async ({ query }) => {
  const target = await services().redirects.resolve(query.path);
  if (!target) throw notFound();
  return ok(target);
});
