import { BulkResendLinks } from "@/contract";
import { ok } from "@/server/http/envelope";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

/** Resends every active phone link of the given events (out-of-scope ids count as 0/0). */
export const POST = adminRoute({ body: BulkResendLinks, permission: "links.manage" }, async ({ actor, body }) =>
  ok(await services().portal.links.bulkResend(actor, body.eventIds)),
);
