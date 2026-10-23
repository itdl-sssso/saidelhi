import { IdParams, MigrationMapPatch } from "@/contract";
import { ok } from "@/server/http/envelope";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

export const GET = adminRoute({ params: IdParams, permission: "migration.run" }, async ({ actor, params }) => ok(await services().portal.migration.get(actor, params.id)));

/** Mapping step only (status `mapping`); returns the recomputed preview. */
export const PATCH = adminRoute({ params: IdParams, body: MigrationMapPatch, permission: "migration.run" }, async ({ actor, params, body }) =>
  ok(await services().portal.migration.patch(actor, params.id, body)),
);
