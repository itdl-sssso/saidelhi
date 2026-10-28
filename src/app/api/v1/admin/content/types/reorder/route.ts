import { ContentTypeReorder } from "@/contract";
import { ok } from "@/server/http/envelope";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

export const POST = adminRoute({ body: ContentTypeReorder, permission: "content.types" }, async ({ actor, body }) => ok(await services().portal.contentTypes.reorder(actor, body)));
