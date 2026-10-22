import { IdParams, LinkCreate } from "@/contract";
import { created } from "@/server/http/envelope";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

/** Issue a report/desk/public link (sent on WhatsApp when `sendTo` is a phone). */
export const POST = adminRoute({ params: IdParams, body: LinkCreate, permission: "links.manage" }, async ({ actor, params, body }) =>
  created(await services().portal.links.create(actor, params.id, body)),
);
