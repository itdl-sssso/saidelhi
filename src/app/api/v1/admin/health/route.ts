import { HealthQuery } from "@/contract";
import { ok } from "@/server/http/envelope";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

export const GET = adminRoute({ query: HealthQuery, permission: "health.read" }, async ({ actor, query }) => ok(await services().portal.health.get(actor, query)));
