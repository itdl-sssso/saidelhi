import { z } from "zod";
import { ApiError } from "@/server/http/errors";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

/** `/admin/reports/monthly/<id>.pdf` */
export const GET = adminRoute({ params: z.object({ file: z.string().regex(/^[A-Za-z0-9_-]{1,100}\.pdf$/) }), permission: "reports.export" }, async ({ actor, params }) => {
  const id = params.file.slice(0, -4);
  if (!id) throw new ApiError("NOT_FOUND");
  const bytes = await services().portal.reports.monthlyPdf(actor, id);
  return new Response(Buffer.from(bytes), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${id}.pdf"`, "Cache-Control": "private, no-store" },
  });
});
