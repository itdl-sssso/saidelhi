import { IdParams, UploadConfirm } from "@/contract";
import { ok } from "@/server/http/envelope";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

/** Loads every row without an error (new events / updated reports awaiting district approval). */
export const POST = adminRoute({ params: IdParams, body: UploadConfirm, permission: "uploads.manage" }, async ({ actor, params, body }) =>
  ok(await services().portal.uploads.confirm(actor, params.id, body.version)),
);
