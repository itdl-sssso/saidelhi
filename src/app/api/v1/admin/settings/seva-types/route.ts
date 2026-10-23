import { SevaTypeCreate } from "@/contract";
import { created, ok } from "@/server/http/envelope";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

export const GET = adminRoute({ permission: "settings.manage" }, async ({ actor }) => ok(await services().portal.settings.sevaTypes.list(actor)));

/** Only built-in seva type codes not yet present. */
export const POST = adminRoute({ body: SevaTypeCreate, permission: "settings.manage" }, async ({ actor, body }) =>
  created(await services().portal.settings.sevaTypes.create(actor, body)),
);
