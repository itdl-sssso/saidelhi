import { AdminDiscoursesQuery, DiscourseCreate } from "@/contract";
import { created, list } from "@/server/http/envelope";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

export const GET = adminRoute({ query: AdminDiscoursesQuery, permission: "discourses.edit" }, async ({ actor, query }) =>
  list(await services().portal.discourses.list(actor, query)),
);

export const POST = adminRoute({ body: DiscourseCreate, permission: "discourses.edit" }, async ({ actor, body }) =>
  created(await services().portal.discourses.create(actor, body)),
);
