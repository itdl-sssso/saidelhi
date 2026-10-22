import { ApprovalsBulk } from "@/contract";
import { ok } from "@/server/http/envelope";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

/** Bulk approve plans (reports are refused per item). */
export const POST = adminRoute({ body: ApprovalsBulk, permission: "approvals.decide" }, async ({ actor, body }) =>
  ok(await services().portal.approvals.bulkApprove(actor, body.ids)),
);
