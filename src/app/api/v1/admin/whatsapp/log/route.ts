import { WaLogQuery } from "@/contract";
import { list } from "@/server/http/envelope";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

export const GET = adminRoute({ query: WaLogQuery, permission: "whatsapp.manage" }, async ({ actor, query }) => list(await services().wa.admin.log(actor, query)));
