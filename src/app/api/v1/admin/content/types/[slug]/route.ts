import { ContentTypeParams, ContentTypePatch } from "@/contract";
import { ok } from "@/server/http/envelope";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

export const PATCH = adminRoute({ params: ContentTypeParams, body: ContentTypePatch, permission: "content.types" }, async ({ actor, params, body }) =>
  ok(await services().portal.contentTypes.patch(actor, params.slug, body)),
);
