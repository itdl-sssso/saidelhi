import { IdParams } from "@/contract";
import { noContent, ok } from "@/server/http/envelope";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

export const GET = adminRoute({ params: IdParams, permission: "uploads.manage" }, async ({ actor, params }) =>
  ok(await services().portal.uploads.get(actor, params.id)),
);

/** Not for loaded batches (422). Removes rows, original file and the batch; audited. */
export const DELETE = adminRoute({ params: IdParams, permission: "uploads.manage" }, async ({ actor, params }) => {
  await services().portal.uploads.remove(actor, params.id);
  return noContent();
});
