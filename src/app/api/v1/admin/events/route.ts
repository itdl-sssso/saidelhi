import { AdminEventsQuery, EventInput } from "@/contract";
import { created, list } from "@/server/http/envelope";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

/** Scoped events with `meta.counts` per status tab. */
export const GET = adminRoute({ query: AdminEventsQuery, permission: "events.read" }, async ({ actor, query }) =>
  list(await services().portal.events.list(actor, query)),
);

/** Plan an event (draft, or `submit: true` to send for approval / self-approve). */
export const POST = adminRoute({ body: EventInput, permission: "events.plan" }, async ({ actor, body, locale }) =>
  created(await services().portal.events.create(actor, body, locale)),
);
