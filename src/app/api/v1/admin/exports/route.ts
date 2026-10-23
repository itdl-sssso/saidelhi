import { ExportRequest } from "@/contract";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

/** CSV download (UTF-8 BOM). Errors stay JSON (422). */
export const POST = adminRoute({ body: ExportRequest, permission: "reports.export" }, async ({ actor, body }) => {
  const res = await services().portal.reports.exportCsv(actor, body);
  return new Response(res.csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${res.filename}"`, "Cache-Control": "no-store" },
  });
});
