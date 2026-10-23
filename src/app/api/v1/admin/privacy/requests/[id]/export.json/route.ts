import { IdParams } from "@/contract";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

/** The person's data as a download (logged; step "exported"). */
export const GET = adminRoute({ params: IdParams }, async ({ actor, params }) => {
  const data = await services().portal.privacy.exportJson(actor, params.id);
  return new Response(JSON.stringify(data, null, 2), {
    headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="privacy-export-${params.id}.json"`, "Cache-Control": "no-store" },
  });
});
