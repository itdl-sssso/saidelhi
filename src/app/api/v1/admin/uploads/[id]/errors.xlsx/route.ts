import { IdParams } from "@/contract";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** The sheet with problem cells coloured and a message column (EN + HI). */
export const GET = adminRoute({ params: IdParams, permission: "uploads.manage" }, async ({ actor, params }) => {
  const file = await services().portal.uploads.errorsXlsx(actor, params.id);
  return new Response(file.bytes as BodyInit, { headers: { "content-type": XLSX, "content-disposition": `attachment; filename="${file.filename}"` } });
});
