import { FormVersionParams } from "@/contract";
import { ok } from "@/server/http/envelope";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

export const GET = adminRoute({ params: FormVersionParams, permission: "forms.read" }, async ({ actor, params }) =>
  ok(await services().portal.forms.versionDefinition(actor, params.id, params.version)),
);
