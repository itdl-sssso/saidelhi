import { ok } from "@/server/http/envelope";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

export const GET = adminRoute({ permission: "reports.export" }, async ({ actor }) => ok(await services().portal.reports.overview(actor)));
