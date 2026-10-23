import { ImpactSettingsPatch } from "@/contract";
import { ok } from "@/server/http/envelope";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

export const GET = adminRoute({ permission: "impact.manage" }, async ({ actor }) => ok(await services().portal.impact.get(actor)));

export const PATCH = adminRoute({ body: ImpactSettingsPatch, permission: "impact.manage" }, async ({ actor, body }) =>
  ok(await services().portal.impact.patch(actor, body)),
);
