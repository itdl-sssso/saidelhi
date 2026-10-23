import { FormDuplicateBody, FormIdParams } from "@/contract";
import { created } from "@/server/http/envelope";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

export const POST = adminRoute({ params: FormIdParams, body: FormDuplicateBody, permission: "forms.manage" }, async ({ actor, params, body }) =>
  created(await services().portal.forms.duplicate(actor, params.id, body)),
);
