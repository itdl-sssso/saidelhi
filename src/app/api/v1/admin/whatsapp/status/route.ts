import { ok } from "@/server/http/envelope";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

export const GET = adminRoute({ permission: "whatsapp.manage" }, async ({ actor }) => ok(await services().wa.admin.status(actor)));
