import { InboxQuery } from "@/contract";
import { list } from "@/server/http/envelope";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

/** `?tab=for_me|escalated|done` with `meta.counts`. */
export const GET = adminRoute({ query: InboxQuery, permission: "inbox.review" }, async ({ actor, query }) => list(await services().wa.inbox.list(actor, query)));
