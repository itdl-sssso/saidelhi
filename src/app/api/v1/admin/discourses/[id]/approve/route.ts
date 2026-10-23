import { DiscourseActionBody, IdParams } from "@/contract";
import { ok } from "@/server/http/envelope";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

/** 422 `fields.blocks|quotes` while paragraphs are unapproved or quotes are not 2–4. */
export const POST = adminRoute({ params: IdParams, body: DiscourseActionBody, permission: "discourses.review" }, async ({ actor, params, body }) =>
  ok(await services().portal.discourses.approve(actor, params.id, body)),
);
