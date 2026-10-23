// Proactive messages to people: free text inside their 24-hour window, a template outside it.
import type { TemplateName } from "../../providers/whatsapp/templates";
import type { UserRec } from "../../repo/portal-types";
import { phoneHash } from "../../security/phone";
import { inSessionWindow } from "../conversations";
import { phoneOf } from "./menu";
import type { BotDeps } from "./types";

export async function reachUser(
  deps: BotDeps,
  user: UserRec,
  text: string,
  fallback: { template: TemplateName; params: readonly string[] },
): Promise<boolean> {
  const phone = phoneOf(deps, user);
  if (!phone) return false;
  try {
    const conv = await deps.repo.wa.conversationByHash(phoneHash(deps.secret, phone));
    if (inSessionWindow(conv, deps.now())) await deps.whatsapp.sendText(phone, text);
    else await deps.whatsapp.sendTemplate(phone, fallback.template, user.locale, fallback.params);
    return true;
  } catch (err) {
    console.error("[bot] could not reach user", user.id, err instanceof Error ? err.message : err);
    return false;
  }
}
