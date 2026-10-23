import { IdParams, MigrationImportBody } from "@/contract";
import { ok } from "@/server/http/envelope";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

/** Idempotent: running it again updates what changed and never duplicates. */
export const POST = adminRoute({ params: IdParams, body: MigrationImportBody, permission: "migration.run" }, async ({ actor, params, body }) =>
  ok(await services().portal.migration.runImport(actor, params.id, body)),
);
