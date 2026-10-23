import { z } from "zod";
import { SevaType, SevaTypePatch } from "@/contract";
import { ok } from "@/server/http/envelope";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

export const PATCH = adminRoute(
  { params: z.object({ code: SevaType }), body: SevaTypePatch, permission: "settings.manage" },
  async ({ actor, params, body }) => ok(await services().portal.settings.sevaTypes.patch(actor, params.code, body)),
);
