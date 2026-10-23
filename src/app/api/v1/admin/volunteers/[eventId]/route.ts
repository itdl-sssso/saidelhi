import { z } from "zod";
import { Id } from "@/contract";
import { ok } from "@/server/http/envelope";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

/** First names + masked phones for one event. Every view is audited. */
export const GET = adminRoute({ params: z.object({ eventId: Id }), permission: "volunteers.read" }, async ({ actor, params }) =>
  ok(await services().portal.volunteers.signups(actor, params.eventId)),
);
