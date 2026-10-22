import { EventPatch, IdParams } from "@/contract";
import { ok } from "@/server/http/envelope";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

export const GET = adminRoute({ params: IdParams, permission: "events.read" }, async ({ actor, params }) =>
  ok(await services().portal.events.get(actor, params.id)),
);

/** Edit plan fields; `version` must match (409 otherwise). */
export const PATCH = adminRoute({ params: IdParams, body: EventPatch, permission: "events.plan" }, async ({ actor, params, body, locale }) =>
  ok(await services().portal.events.patch(actor, params.id, body, locale)),
);
