import { VolunteerNotifyBody } from "@/contract";
import { ok } from "@/server/http/envelope";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

/** Per-coordinator WhatsApp alert when someone signs up (template `volunteer_signup_alert`). */
export const PATCH = adminRoute({ body: VolunteerNotifyBody, permission: "volunteers.read" }, async ({ actor, body }) =>
  ok(await services().portal.volunteers.setNotify(actor, body)),
);
