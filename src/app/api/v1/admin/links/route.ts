import { AdminLinksQuery } from "@/contract";
import { list } from "@/server/http/envelope";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

/** Scoped form links with `meta.expiringSoon`. */
export const GET = adminRoute({ query: AdminLinksQuery, permission: "links.read" }, async ({ actor, query }) =>
  list(await services().portal.links.list(actor, query)),
);
