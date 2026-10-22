import { PersonInvite } from "@/contract";
import { created } from "@/server/http/envelope";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

/** Creates the person (status invited) and sends the `invite_coordinator` WhatsApp template. */
export const POST = adminRoute({ body: PersonInvite, permission: "people.invite" }, async ({ actor, body }) =>
  created(await services().portal.people.invite(actor, body)),
);
