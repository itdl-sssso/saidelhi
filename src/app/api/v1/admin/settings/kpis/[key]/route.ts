import { z } from "zod";
import { KpiDefinitionPatch } from "@/contract";
import { ok } from "@/server/http/envelope";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

export const PATCH = adminRoute(
  { params: z.object({ key: z.string().min(1).max(64) }), body: KpiDefinitionPatch, permission: "settings.manage" },
  async ({ actor, params, body }) => ok(await services().portal.settings.kpis.patch(actor, params.key, body)),
);
