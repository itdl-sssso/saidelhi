import { FormIdParams, FormTestBody } from "@/contract";
import { ok } from "@/server/http/envelope";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

/** Dry run against the draft (else published). Nothing is stored. */
export const POST = adminRoute({ params: FormIdParams, body: FormTestBody, permission: "forms.read" }, async ({ actor, params, body }) =>
  ok(await services().portal.forms.test(actor, params.id, body)),
);
