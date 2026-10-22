import { IdParams, OrgPatch } from "@/contract";
import { ok } from "@/server/http/envelope";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

/** Rename or move; `code` is read-only (sending it is 422). */
export const PATCH = adminRoute({ params: IdParams, body: OrgPatch, permission: "org.manage" }, async ({ actor, params, body }) =>
  ok(await services().portal.org.patch(actor, params.id, body)),
);
