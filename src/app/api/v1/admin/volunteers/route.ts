import { VolunteersQuery } from "@/contract";
import { list } from "@/server/http/envelope";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

/** Events that asked for volunteers (default: next 30 days) with sign-up counts. `meta.notifyOnSignup` = caller's alert preference. */
export const GET = adminRoute({ query: VolunteersQuery, permission: "volunteers.read" }, async ({ actor, query }) =>
  list(await services().portal.volunteers.list(actor, query)),
);
