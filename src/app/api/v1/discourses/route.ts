import { DiscoursesQuery } from "@/contract";
import { ok } from "@/server/http/envelope";
import { notFound } from "@/server/http/errors";
import { route } from "@/server/http/route";
import { services } from "@/server/services";

/** Flag `discourses` off → 404 (same as an unknown route). */
export const GET = route({ query: DiscoursesQuery }, async ({ query }) => {
  const payload = await services().discourses.list(query);
  if (!payload) throw notFound();
  return ok(payload);
});
