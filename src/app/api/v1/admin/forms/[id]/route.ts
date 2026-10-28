import { FormDraftPatch, FormIdParams } from "@/contract";
import { noContent, ok } from "@/server/http/envelope";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

export const GET = adminRoute({ params: FormIdParams, permission: "forms.read" }, async ({ actor, params }) =>
  ok(await services().portal.forms.detail(actor, params.id)),
);

/** Replaces the draft (`version` null creates it). Locked core fields cannot go (422). */
export const PATCH = adminRoute({ params: FormIdParams, body: FormDraftPatch, permission: "forms.manage" }, async ({ actor, params, body }) =>
  ok(await services().portal.forms.patchDraft(actor, params.id, body)),
);

/** Archives the template (soft delete). 422 while live links, a Settings pin or the last report form of a seva type depend on it. */
export const DELETE = adminRoute({ params: FormIdParams, permission: "forms.manage" }, async ({ actor, params }) => {
  await services().portal.forms.remove(actor, params.id);
  return noContent();
});
