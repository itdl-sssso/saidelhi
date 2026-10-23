import { PartnerInput, PartnersQuery } from "@/contract";
import { created, list } from "@/server/http/envelope";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

export const GET = adminRoute({ query: PartnersQuery, permission: "partners.manage" }, async ({ actor, query }) =>
  list(await services().portal.partners.list(actor, query)),
);

export const POST = adminRoute({ body: PartnerInput, permission: "partners.manage" }, async ({ actor, body }) =>
  created(await services().portal.partners.create(actor, body)),
);
