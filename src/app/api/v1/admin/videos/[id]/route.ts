import { IdParams, VideoPatch } from "@/contract";
import { noContent, ok } from "@/server/http/envelope";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

/** Refreshes the status from the provider while the video is still uploading/processing. */
export const GET = adminRoute({ params: IdParams, permission: "content.edit" }, async ({ actor, params }) => ok(await services().portal.videos.get(actor, params.id)));

/** `version` required. Title and poster time. */
export const PATCH = adminRoute({ params: IdParams, body: VideoPatch, permission: "content.edit" }, async ({ actor, params, body }) => ok(await services().portal.videos.patch(actor, params.id, body)));

/** 409 while an article uses the video. Deletes the provider copy too. */
export const DELETE = adminRoute({ params: IdParams, permission: "content.edit" }, async ({ actor, params }) => {
  await services().portal.videos.remove(actor, params.id);
  return noContent();
});
