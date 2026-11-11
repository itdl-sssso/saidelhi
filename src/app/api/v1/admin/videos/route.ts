import { AdminVideosQuery, VideoCreate } from "@/contract";
import { created, list } from "@/server/http/envelope";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

/** Library, newest first. `ready=1` = picker. Permission `content.edit`. */
export const GET = adminRoute({ query: AdminVideosQuery, permission: "content.edit" }, async ({ actor, query }) => list(await services().portal.videos.list(actor, query)));

/** Creates the record and returns it with a one-time tus `uploadUrl` (browser uploads straight to the provider). */
export const POST = adminRoute({ body: VideoCreate, permission: "content.edit" }, async ({ actor, body }) => created(await services().portal.videos.create(actor, body)));
