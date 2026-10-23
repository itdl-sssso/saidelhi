import { IdParams, PrivacyFindBody } from "@/contract";
import { ok } from "@/server/http/envelope";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

export const POST = adminRoute({ params: IdParams, body: PrivacyFindBody }, async ({ actor, params, body }) => ok(await services().portal.privacy.find(actor, params.id, body)));
