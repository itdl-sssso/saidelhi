import { IdParams, PersonPatch } from "@/contract";
import { ok } from "@/server/http/envelope";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

/** Edit name/email/locale or role + scope (`version` required). */
export const PATCH = adminRoute({ params: IdParams, body: PersonPatch, permission: "people.manage" }, async ({ actor, params, body }) =>
  ok(await services().portal.people.patch(actor, params.id, body)),
);
