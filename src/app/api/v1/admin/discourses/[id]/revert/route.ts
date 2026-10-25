import { DiscourseRevertBody, IdParams } from "@/contract";
import { ok } from "@/server/http/envelope";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

export const POST = adminRoute({ params: IdParams, body: DiscourseRevertBody, permission: "discourses.edit" }, async ({ actor, params, body }) =>
  ok(await services().portal.discourses.revert(actor, params.id, body)),
);
