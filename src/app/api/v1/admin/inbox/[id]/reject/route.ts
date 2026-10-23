import { InboxRejectBody, InboxIdParams } from "@/contract";
import { ok } from "@/server/http/envelope";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

/** The reason is messaged back to the sender on WhatsApp. */
export const POST = adminRoute({ params: InboxIdParams, body: InboxRejectBody, permission: "inbox.review" }, async ({ actor, params, body }) =>
  ok(await services().wa.inbox.reject(actor, params.id, body)),
);
