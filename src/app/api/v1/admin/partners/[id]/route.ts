import { IdParams, PartnerPatch } from "@/contract";
import { ok } from "@/server/http/envelope";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

export const PATCH = adminRoute({ params: IdParams, body: PartnerPatch, permission: "partners.manage" }, async ({ actor, params, body }) =>
  ok(await services().portal.partners.patch(actor, params.id, body)),
);
