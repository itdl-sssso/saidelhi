import { ok } from "@/server/http/envelope";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

export const GET = adminRoute({}, async ({ actor }) => ok(await services().portal.privacy.overview(actor)));
