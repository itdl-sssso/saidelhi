import { InboxApproveBody, InboxIdParams } from "@/contract";
import { ok } from "@/server/http/envelope";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

/** Creates a submission on the event (event -> report_submitted). */
export const POST = adminRoute({ params: InboxIdParams, body: InboxApproveBody, permission: "inbox.review" }, async ({ actor, params, body }) =>
  ok(await services().wa.inbox.approve(actor, params.id, body)),
);
