import { DiscourseAiDraftBody, IdParams } from "@/contract";
import { ok } from "@/server/http/envelope";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

export const POST = adminRoute({ params: IdParams, body: DiscourseAiDraftBody, permission: "discourses.edit" }, async ({ actor, params, body }) =>
  ok(await services().portal.discourses.aiDraft(actor, params.id, body)),
);
