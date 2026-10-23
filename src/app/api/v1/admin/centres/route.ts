import { CentreInput, CentresAdminQuery } from "@/contract";
import { created, list } from "@/server/http/envelope";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

/** Centres in the viewer's scope (samithi coordinator: just their own). */
export const GET = adminRoute({ query: CentresAdminQuery, permission: "centres.manage" }, async ({ actor, query }) =>
  list(await services().portal.centres.list(actor, query)),
);

export const POST = adminRoute({ body: CentreInput, permission: "centres.manage" }, async ({ actor, body }) =>
  created(await services().portal.centres.create(actor, body)),
);
