import { IdParams } from "@/contract";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

/** A4 printable QR poster for a link (logged). */
export const GET = adminRoute({ params: IdParams, permission: "links.read" }, async ({ actor, params }) => {
  const { bytes, filename } = await services().portal.links.qrPdf(actor, params.id);
  return new Response(Buffer.from(bytes), {
    status: 200,
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="${filename}"`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
});
