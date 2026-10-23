import { IdParams } from "@/contract";
import { ok } from "@/server/http/envelope";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

export const POST = adminRoute({ params: IdParams, permission: "followup.reveal" }, async ({ actor, params }) =>
  ok(await services().portal.followUp.revealPhone(actor, params.id), { headers: { "Cache-Control": "no-store" } }),
);
