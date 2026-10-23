import { DiscourseActionBody, IdParams } from "@/contract";
import { ok } from "@/server/http/envelope";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

export const POST = adminRoute({ params: IdParams, body: DiscourseActionBody, permission: "discourses.publish" }, async ({ actor, params, body }) =>
  ok(await services().portal.discourses.unpublish(actor, params.id, body)),
);
