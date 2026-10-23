import { ChangeRequestCreate, FormIdParams } from "@/contract";
import { created } from "@/server/http/envelope";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

/** District asks the state team for a form change. */
export const POST = adminRoute({ params: FormIdParams, body: ChangeRequestCreate, permission: "forms.read" }, async ({ actor, params, body }) =>
  created(await services().portal.forms.createChangeRequest(actor, params.id, body)),
);
