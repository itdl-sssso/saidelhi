import { IdParams, ReminderPatchBody } from "@/contract";
import { ok } from "@/server/http/envelope";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

export const PATCH = adminRoute({ params: IdParams, body: ReminderPatchBody }, async ({ actor, params, body }) =>
  ok(await services().wa.admin.patchReminder(actor, params.id, body)),
);
