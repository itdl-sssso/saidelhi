import { IdParams, PrivacyEraseBody } from "@/contract";
import { ok } from "@/server/http/envelope";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

export const POST = adminRoute({ params: IdParams, body: PrivacyEraseBody }, async ({ actor, params, body }) => ok(await services().portal.privacy.erase(actor, params.id, body)));
