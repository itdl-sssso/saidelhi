import { ApprovalsQuery } from "@/contract";
import { list } from "@/server/http/envelope";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

/** `?tab=plans|reports|escalated` with `meta.counts`. */
export const GET = adminRoute({ query: ApprovalsQuery, permission: "approvals.read" }, async ({ actor, query }) =>
  list(await services().portal.approvals.list(actor, query)),
);
