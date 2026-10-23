import { DiscoursePatch, IdParams } from "@/contract";
import { ok } from "@/server/http/envelope";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

export const GET = adminRoute({ params: IdParams, permission: "discourses.edit" }, async ({ actor, params }) =>
  ok(await services().portal.discourses.get(actor, params.id)),
);

/** 409 CONFLICT on a stale `version`; 422 `fields.quotes.<i>` / `fields.blocks.<i>`. */
export const PATCH = adminRoute({ params: IdParams, body: DiscoursePatch, permission: "discourses.edit" }, async ({ actor, params, body }) =>
  ok(await services().portal.discourses.patch(actor, params.id, body)),
);
