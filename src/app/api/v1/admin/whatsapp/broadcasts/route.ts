import { BroadcastBody } from "@/contract";
import { ok } from "@/server/http/envelope";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

/** `dryRun: true` returns the recipient count and cost estimate and sends nothing. Opted-in numbers only. */
export const POST = adminRoute({ body: BroadcastBody, permission: "whatsapp.manage" }, async ({ actor, body }) =>
  ok(await services().wa.admin.broadcast(actor, body)),
);
