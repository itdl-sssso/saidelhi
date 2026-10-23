import { ContentPatch, IdParams } from "@/contract";
import { noContent, ok } from "@/server/http/envelope";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

export const GET = adminRoute({ params: IdParams, permission: "content.edit" }, async ({ actor, params }) => ok(await services().portal.content.get(actor, params.id)));

/** Legacy posts (`legacy-<id>`, version 0) are copied into the native table on first PATCH. */
export const PATCH = adminRoute({ params: IdParams, body: ContentPatch, permission: "content.edit" }, async ({ actor, params, body }) =>
  ok(await services().portal.content.patch(actor, params.id, body)),
);

/** Drafts only. */
export const DELETE = adminRoute({ params: IdParams, permission: "content.edit" }, async ({ actor, params }) => {
  await services().portal.content.remove(actor, params.id);
  return noContent();
});
