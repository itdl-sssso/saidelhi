import { FollowUpCall, IdParams } from "@/contract";
import { ok } from "@/server/http/envelope";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

export const POST = adminRoute({ params: IdParams, body: FollowUpCall, permission: "followup.read" }, async ({ actor, params, body }) =>
  ok(await services().portal.followUp.call(actor, params.id, body)),
);
