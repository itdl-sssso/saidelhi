import { IdParams } from "@/contract";
import { ok } from "@/server/http/envelope";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

/** Thread view; each view is audited. */
export const GET = adminRoute({ params: IdParams, permission: "whatsapp.manage" }, async ({ actor, params }) => ok(await services().wa.admin.conversation(actor, params.id)));
