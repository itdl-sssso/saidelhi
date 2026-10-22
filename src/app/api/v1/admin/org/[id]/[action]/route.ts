import { z } from "zod";
import { Id } from "@/contract";
import { ok } from "@/server/http/envelope";
import { ApiError } from "@/server/http/errors";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

const Params = z.object({ id: Id, action: z.enum(["merge", "deactivate"]) });
const Body = z.object({ version: z.number().int().positive(), intoId: Id.optional() });

/** merge `{ intoId, version }` · deactivate `{ version }`. History is always kept. */
export const POST = adminRoute({ params: Params, body: Body, permission: "org.manage" }, async ({ actor, params, body }) => {
  const org = services().portal.org;
  if (params.action === "deactivate") return ok(await org.deactivate(actor, params.id, body));
  if (!body.intoId) throw new ApiError("VALIDATION_FAILED", { fields: { intoId: "Choose the samithi to merge into." } });
  return ok(await org.merge(actor, params.id, { intoId: body.intoId, version: body.version }));
});
