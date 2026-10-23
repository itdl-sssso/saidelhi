import { IdParams } from "@/contract";
import { ok } from "@/server/http/envelope";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

export const GET = adminRoute({ params: IdParams, permission: "uploads.manage" }, async ({ actor, params }) =>
  ok(await services().portal.uploads.get(actor, params.id)),
);
