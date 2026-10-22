import { EventActionBody, EventActionParams } from "@/contract";
import { ok } from "@/server/http/envelope";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

/** submit · approve-plan · approve-report · request-changes · cancel · postpone · reopen. Illegal moves → 409. */
export const POST = adminRoute({ params: EventActionParams, body: EventActionBody }, async ({ actor, params, body, locale }) =>
  ok(await services().portal.events.act(actor, params.id, params.action, body, locale)),
);
