import { InboxEscalateBody, InboxIdParams } from "@/contract";
import { ok } from "@/server/http/envelope";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

/** District -> state team. */
export const POST = adminRoute({ params: InboxIdParams, body: InboxEscalateBody, permission: "inbox.review" }, async ({ actor, params, body }) =>
  ok(await services().wa.inbox.escalate(actor, params.id, body)),
);
