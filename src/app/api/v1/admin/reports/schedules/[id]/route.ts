import { IdParams, ReportSchedulePatch } from "@/contract";
import { ok } from "@/server/http/envelope";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

export const PATCH = adminRoute({ params: IdParams, body: ReportSchedulePatch, permission: "reports.export" }, async ({ actor, params, body }) =>
  ok(await services().portal.reports.patchSchedule(actor, params.id, body)),
);
