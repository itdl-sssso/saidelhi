import { z } from "zod";
import { IdParams } from "@/contract";
import { ok } from "@/server/http/envelope";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

const Body = z.object({ version: z.number().int().positive().optional() });

/** Immediate: revokes every session of the person. */
export const POST = adminRoute({ params: IdParams, body: Body, permission: "people.manage" }, async ({ actor, params, body }) =>
  ok(await services().portal.people.deactivate(actor, params.id, body)),
);
