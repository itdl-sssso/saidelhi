import { BreachCreate } from "@/contract";
import { created, ok } from "@/server/http/envelope";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

export const GET = adminRoute({}, async ({ actor }) => ok(await services().portal.privacy.breaches(actor)));

export const POST = adminRoute({ body: BreachCreate }, async ({ actor, body }) => created(await services().portal.privacy.createBreach(actor, body)));
