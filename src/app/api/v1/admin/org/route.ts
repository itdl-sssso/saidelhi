import { OrgCreate } from "@/contract";
import { created } from "@/server/http/envelope";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

export const POST = adminRoute({ body: OrgCreate, permission: "org.manage" }, async ({ actor, body }) =>
  created(await services().portal.org.create(actor, body)),
);
