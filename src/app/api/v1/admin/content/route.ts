import { ContentCreate, ContentQuery } from "@/contract";
import { created, list } from "@/server/http/envelope";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

/** Articles (native + legacy) and content items, with `meta.counts` per tab. */
export const GET = adminRoute({ query: ContentQuery, permission: "content.edit" }, async ({ actor, query }) => list(await services().portal.content.list(actor, query)));

export const POST = adminRoute({ body: ContentCreate, permission: "content.edit" }, async ({ actor, body }) => created(await services().portal.content.create(actor, body)));
