import { IdParams, ImpactEstimatePatch } from "@/contract";
import { noContent, ok } from "@/server/http/envelope";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

export const PATCH = adminRoute({ params: IdParams, body: ImpactEstimatePatch, permission: "impact.manage" }, async ({ actor, params, body }) =>
  ok(await services().portal.impact.estimates.patch(actor, params.id, body)),
);

export const DELETE = adminRoute({ params: IdParams, permission: "impact.manage" }, async ({ actor, params }) => {
  await services().portal.impact.estimates.remove(actor, params.id);
  return noContent();
});
