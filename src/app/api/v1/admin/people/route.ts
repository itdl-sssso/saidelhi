import { PeopleQuery } from "@/contract";
import { list } from "@/server/http/envelope";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

/** Scoped people with `meta.reviewDue` (no sign-in for 90 days). Phones are masked. */
export const GET = adminRoute({ query: PeopleQuery, permission: "people.read" }, async ({ actor, query }) =>
  list(await services().portal.people.list(actor, query)),
);
