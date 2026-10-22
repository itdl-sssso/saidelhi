import { AuditQuery } from "@/contract";
import { list } from "@/server/http/envelope";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

/** Read-only, newest first. */
export const GET = adminRoute({ query: AuditQuery, permission: "audit.read" }, async ({ actor, query }) =>
  list(await services().portal.audit.list(actor, query)),
);
