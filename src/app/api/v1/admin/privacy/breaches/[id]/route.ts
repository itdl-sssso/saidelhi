import { BreachPatch, IdParams } from "@/contract";
import { ok } from "@/server/http/envelope";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

export const PATCH = adminRoute({ params: IdParams, body: BreachPatch }, async ({ actor, params, body }) => ok(await services().portal.privacy.patchBreach(actor, params.id, body)));
