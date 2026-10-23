import { InboxIdParams, InboxPatchBody } from "@/contract";
import { ok } from "@/server/http/envelope";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

export const GET = adminRoute({ params: InboxIdParams, permission: "inbox.review" }, async ({ actor, params }) => ok(await services().wa.inbox.get(actor, params.id)));

/** Save draft edits or the event match (`version` required; stale -> 409). */
export const PATCH = adminRoute({ params: InboxIdParams, body: InboxPatchBody, permission: "inbox.review" }, async ({ actor, params, body }) =>
  ok(await services().wa.inbox.patch(actor, params.id, body)),
);
