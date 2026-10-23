import { z } from "zod";
import { RedirectInput, RedirectsQuery } from "@/contract";
import { created, list, noContent } from "@/server/http/envelope";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

export const GET = adminRoute({ query: RedirectsQuery, permission: "migration.run" }, async ({ actor, query }) => list(await services().portal.migration.redirects.list(actor, query)));

/** Upsert by `from`; live immediately. */
export const POST = adminRoute({ body: RedirectInput, permission: "migration.run" }, async ({ actor, body }) => created(await services().portal.migration.redirects.upsert(actor, body)));

/** `?from=` (not for built-in rule rows). */
export const DELETE = adminRoute({ query: z.object({ from: z.string().min(1).max(500) }), permission: "migration.run" }, async ({ actor, query }) => {
  await services().portal.migration.redirects.remove(actor, query.from);
  return noContent();
});
