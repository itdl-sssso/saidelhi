import { MonthlyReportCreate } from "@/contract";
import { ok } from "@/server/http/envelope";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

/** Generates (or regenerates) a monthly PDF. Built inline, answered 202 with the finished row. */
export const POST = adminRoute({ body: MonthlyReportCreate, permission: "reports.export" }, async ({ actor, body }) =>
  ok(await services().portal.reports.generateMonthly(actor, body), { status: 202 }),
);
