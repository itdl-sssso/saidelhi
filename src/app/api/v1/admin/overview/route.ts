import { OverviewQuery } from "@/contract";
import { ok } from "@/server/http/envelope";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

/** `?scope=<unit id>` narrows to a unit inside the viewer's scope (state admins: any). */
export const GET = adminRoute({ query: OverviewQuery, permission: "overview.read" }, async ({ actor, query }) =>
  ok(await services().portal.overview.get(actor, query.scope)),
);
