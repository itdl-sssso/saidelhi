import { FollowUpQuery } from "@/contract";
import { list } from "@/server/http/envelope";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

export const GET = adminRoute({ query: FollowUpQuery, permission: "followup.read" }, async ({ actor, query }) =>
  list(await services().portal.followUp.list(actor, query)),
);
