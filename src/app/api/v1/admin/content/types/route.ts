import { ContentTypeCreate } from "@/contract";
import { created, ok } from "@/server/http/envelope";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

/** Article types in order, inactive included (the editor lists the active ones). */
export const GET = adminRoute({ permission: "content.edit" }, async ({ actor }) => ok(await services().portal.contentTypes.list(actor)));

/** State admin only. */
export const POST = adminRoute({ body: ContentTypeCreate, permission: "content.types" }, async ({ actor, body }) => created(await services().portal.contentTypes.create(actor, body)));
