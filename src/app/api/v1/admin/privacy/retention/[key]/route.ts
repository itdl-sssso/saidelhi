import { z } from "zod";
import { RetentionPatch } from "@/contract";
import { ok } from "@/server/http/envelope";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

export const PATCH = adminRoute({ params: z.object({ key: z.string().min(1).max(40) }), body: RetentionPatch }, async ({ actor, params, body }) =>
  ok(await services().portal.privacy.setRetention(actor, params.key, body.enabled)),
);
