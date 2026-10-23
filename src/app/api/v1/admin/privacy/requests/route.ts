import { PrivacyRequestsQuery } from "@/contract";
import { list } from "@/server/http/envelope";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

export const GET = adminRoute({ query: PrivacyRequestsQuery }, async ({ actor, query }) => list(await services().portal.privacy.requests(actor, query)));
