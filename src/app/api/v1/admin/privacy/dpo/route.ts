import { DataProtectionLead } from "@/contract";
import { ok } from "@/server/http/envelope";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

export const PATCH = adminRoute({ body: DataProtectionLead }, async ({ actor, body }) => ok(await services().portal.privacy.setDpo(actor, body)));
