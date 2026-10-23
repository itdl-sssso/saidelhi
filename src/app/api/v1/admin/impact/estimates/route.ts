import { ImpactEstimateInput, ImpactEstimatesQuery } from "@/contract";
import { created, list } from "@/server/http/envelope";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

export const GET = adminRoute({ query: ImpactEstimatesQuery, permission: "impact.manage" }, async ({ actor, query }) =>
  list(await services().portal.impact.estimates.list(actor, query)),
);

export const POST = adminRoute({ body: ImpactEstimateInput, permission: "impact.manage" }, async ({ actor, body }) =>
  created(await services().portal.impact.estimates.create(actor, body)),
);
