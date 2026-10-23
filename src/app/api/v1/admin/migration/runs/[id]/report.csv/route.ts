import { IdParams } from "@/contract";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

export const GET = adminRoute({ params: IdParams, permission: "migration.run" }, async ({ actor, params }) => {
  const csv = await services().portal.migration.reportCsv(actor, params.id);
  return new Response(`﻿${csv}`, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="migration-${params.id}.csv"`, "cache-control": "no-store" } });
});
