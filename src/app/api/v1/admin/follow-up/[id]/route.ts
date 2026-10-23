import { FollowUpPatch, IdParams } from "@/contract";
import { ok } from "@/server/http/envelope";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

export const GET = adminRoute({ params: IdParams, permission: "followup.read" }, async ({ actor, params }) =>
  ok(await services().portal.followUp.get(actor, params.id)),
);

export const PATCH = adminRoute({ params: IdParams, body: FollowUpPatch, permission: "followup.read" }, async ({ actor, params, body }) =>
  ok(await services().portal.followUp.patch(actor, params.id, body)),
);
