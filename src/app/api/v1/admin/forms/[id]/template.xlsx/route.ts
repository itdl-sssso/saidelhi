import { FormIdParams, TemplateXlsxQuery } from "@/contract";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** Excel template of the current (or `version`) form; `samithi` pre-fills `samithi_code`. */
export const GET = adminRoute({ params: FormIdParams, query: TemplateXlsxQuery, permission: "forms.read" }, async ({ actor, params, query }) => {
  const file = await services().portal.forms.templateXlsx(actor, params.id, query);
  return new Response(file.bytes as BodyInit, { headers: { "content-type": XLSX, "content-disposition": `attachment; filename="${file.filename}"` } });
});
