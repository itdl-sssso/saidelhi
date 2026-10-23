import { FormIdParams, FormPublishBody } from "@/contract";
import { ok } from "@/server/http/envelope";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

/** 422 `fields` (by field id or check key) when a blocking check fails. Live links keep their version. */
export const POST = adminRoute({ params: FormIdParams, body: FormPublishBody, permission: "forms.manage" }, async ({ actor, params, body }) =>
  ok(await services().portal.forms.publish(actor, params.id, body.version)),
);
