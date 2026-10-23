import { ChangeRequestDecision, IdParams } from "@/contract";
import { ok } from "@/server/http/envelope";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

export const PATCH = adminRoute({ params: IdParams, body: ChangeRequestDecision, permission: "forms.manage" }, async ({ actor, params, body }) =>
  ok(await services().portal.forms.decideChangeRequest(actor, params.id, body)),
);
