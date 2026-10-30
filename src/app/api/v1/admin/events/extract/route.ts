import { EventFromMessageBody } from "@/contract";
import { ok } from "@/server/http/envelope";
import { ApiError } from "@/server/http/errors";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

/** Plan event prefill from a pasted WhatsApp message or an inbox item's text (nothing is saved). */
export const POST = adminRoute({ body: EventFromMessageBody, permission: "events.plan" }, async ({ actor, body }) => {
  const s = services();
  let text: string | null;
  if ("text" in body) text = body.text;
  else text = (await s.wa.inbox.get(actor, body.inboxId)).raw.text;
  if (!text?.trim()) throw new ApiError("VALIDATION_FAILED", { fields: { inboxId: "This item has no message text." } });
  return ok(await s.portal.events.fromMessage(actor, text));
});
