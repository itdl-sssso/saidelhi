import { ThoughtsQuery } from "@/contract";
import { ok } from "@/server/http/envelope";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

/** One entry per day in [from, to] (≤ 62 days). */
export const GET = adminRoute({ query: ThoughtsQuery, permission: "content.edit" }, async ({ actor, query }) => ok(await services().portal.content.thoughts(actor, query)));
