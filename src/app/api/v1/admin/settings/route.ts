import { SettingsPatch } from "@/contract";
import { ok } from "@/server/http/envelope";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

/** Feature flags, link defaults, escalation, analytics status. */
export const GET = adminRoute({ permission: "settings.manage" }, async ({ actor }) => ok(await services().portal.settings.get(actor)));

/** Partial update (`version` required; 409 when stale). Applies to new links / future escalations only. */
export const PATCH = adminRoute({ body: SettingsPatch, permission: "settings.manage" }, async ({ actor, body }) =>
  ok(await services().portal.settings.patch(actor, body)),
);
