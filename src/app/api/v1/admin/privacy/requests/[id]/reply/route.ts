import { IdParams, PrivacyReplyBody } from "@/contract";
import { ok } from "@/server/http/envelope";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

export const POST = adminRoute({ params: IdParams, body: PrivacyReplyBody }, async ({ actor, params, body }) => ok(await services().portal.privacy.reply(actor, params.id, body)));
