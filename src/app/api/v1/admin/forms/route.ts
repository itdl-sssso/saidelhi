import { FormTemplateCreate } from "@/contract";
import { created, ok } from "@/server/http/envelope";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

/** `FormsPayload`: templates, change requests (district: own), what the viewer can do. */
export const GET = adminRoute({ permission: "forms.read" }, async ({ actor }) => ok(await services().portal.forms.list(actor)));

/** New empty draft with the locked core fields, or a copy of `fromTemplateId`. */
export const POST = adminRoute({ body: FormTemplateCreate, permission: "forms.manage" }, async ({ actor, body }) =>
  created(await services().portal.forms.create(actor, body)),
);
