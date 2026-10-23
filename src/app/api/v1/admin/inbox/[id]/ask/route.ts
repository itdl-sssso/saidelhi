import { InboxAskBody, InboxIdParams } from "@/contract";
import { ok } from "@/server/http/envelope";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

/** Sends the question to the sender on WhatsApp; their reply joins the thread. */
export const POST = adminRoute({ params: InboxIdParams, body: InboxAskBody, permission: "inbox.review" }, async ({ actor, params, body }) =>
  ok(await services().wa.inbox.ask(actor, params.id, body)),
);
