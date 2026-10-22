import { z } from "zod";
import { Id, ISODateTime, Locale } from "@/contract";
import { ok } from "@/server/http/envelope";
import { ApiError } from "@/server/http/errors";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

const Params = z.object({ id: Id, action: z.enum(["resend", "extend", "revoke"]) });
const Body = z.object({ expiresAt: ISODateTime.optional(), lang: Locale.optional() });

/** resend (WhatsApp) · extend `{ expiresAt }` · revoke. */
export const POST = adminRoute({ params: Params, body: Body, permission: "links.manage" }, async ({ actor, params, body }) => {
  const links = services().portal.links;
  if (params.action === "resend") return ok(await links.resend(actor, params.id, body.lang));
  if (params.action === "revoke") return ok(await links.revoke(actor, params.id));
  if (!body.expiresAt) throw new ApiError("VALIDATION_FAILED", { fields: { expiresAt: "Choose the new end date." } });
  return ok(await links.extend(actor, params.id, new Date(body.expiresAt)));
});
