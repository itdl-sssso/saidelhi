import { FromEventParams } from "@/contract";
import { created } from "@/server/http/envelope";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

/** Approved events only → 201 draft `news` article with the results card. */
export const POST = adminRoute({ params: FromEventParams, permission: "content.edit" }, async ({ actor, params }) =>
  created(await services().portal.content.fromEvent(actor, params.eventId)),
);
