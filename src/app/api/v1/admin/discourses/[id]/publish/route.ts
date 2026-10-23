import { DiscourseActionBody, IdParams } from "@/contract";
import { ok } from "@/server/http/envelope";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

/** 422 `fields.flag_off|not_approved`. Writes the public snapshot and revalidates the `discourses` tag. */
export const POST = adminRoute({ params: IdParams, body: DiscourseActionBody, permission: "discourses.publish" }, async ({ actor, params, body }) =>
  ok(await services().portal.discourses.publish(actor, params.id, body)),
);
