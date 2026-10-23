import { CentrePatch, IdParams } from "@/contract";
import { ok } from "@/server/http/envelope";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

export const GET = adminRoute({ params: IdParams, permission: "centres.manage" }, async ({ actor, params }) =>
  ok(await services().portal.centres.get(actor, params.id)),
);

/** `version` required (409 when stale). `contactPhone` must not be a portal user's number (422). */
export const PATCH = adminRoute({ params: IdParams, body: CentrePatch, permission: "centres.manage" }, async ({ actor, params, body }) =>
  ok(await services().portal.centres.patch(actor, params.id, body)),
);
