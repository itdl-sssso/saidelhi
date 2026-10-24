import { DiscourseMediaParams, DiscourseMediaPatch } from "@/contract";
import { ok } from "@/server/http/envelope";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

/** Approve/hide and/or reorder one audio/video candidate → full `AdminDiscourseDetail`. 404 unknown media. */
export const POST = adminRoute({ params: DiscourseMediaParams, body: DiscourseMediaPatch, permission: "discourses.review" }, async ({ actor, params, body }) =>
  ok(await services().portal.discourses.setMedia(actor, params.id, params.mediaId, body)),
);
