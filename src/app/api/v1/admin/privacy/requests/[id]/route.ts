import { IdParams, PrivacyRequestPatch } from "@/contract";
import { ok } from "@/server/http/envelope";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

export const GET = adminRoute({ params: IdParams }, async ({ actor, params }) => ok(await services().portal.privacy.request(actor, params.id)));

export const PATCH = adminRoute({ params: IdParams, body: PrivacyRequestPatch }, async ({ actor, params, body }) =>
  ok(await services().portal.privacy.patchRequest(actor, params.id, body)),
);
