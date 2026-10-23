import { UploadTemplateQuery } from "@/contract";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** Template for a seva type's current report form; `samithi` pre-fills the samithi code. */
export const GET = adminRoute({ query: UploadTemplateQuery, permission: "uploads.manage" }, async ({ actor, query }) => {
  const file = await services().portal.uploads.template(actor, query);
  return new Response(file.bytes as BodyInit, { headers: { "content-type": XLSX, "content-disposition": `attachment; filename="${file.filename}"` } });
});
