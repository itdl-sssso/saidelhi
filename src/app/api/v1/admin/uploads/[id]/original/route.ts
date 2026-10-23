import { IdParams } from "@/contract";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

export const GET = adminRoute({ params: IdParams, permission: "uploads.manage" }, async ({ actor, params }) => {
  const file = await services().portal.uploads.original(actor, params.id);
  const name = file.filename.replace(/["\\\r\n]/g, "_");
  return new Response(file.bytes as BodyInit, { headers: { "content-type": file.mime, "content-disposition": `attachment; filename="${name}"` } });
});
