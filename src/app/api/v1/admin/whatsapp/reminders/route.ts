import { ok } from "@/server/http/envelope";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

/** State admins and district coordinators (whatsapp.manage or whatsapp.reminders is checked in the service). */
export const GET = adminRoute({}, async ({ actor }) => ok(await services().wa.admin.reminders(actor)));
