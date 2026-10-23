import { FormIdParams } from "@/contract";
import { ok } from "@/server/http/envelope";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

export const GET = adminRoute({ params: FormIdParams, permission: "forms.read" }, async ({ actor, params }) =>
  ok(await services().portal.forms.versions(actor, params.id)),
);
