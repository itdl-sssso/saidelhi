import "server-only";
import { env } from "../../env";
import { CloudWhatsApp } from "./cloud";
import { ConsoleWhatsApp } from "./console";
import type { WhatsAppProvider } from "./types";

export type { DevMessage, SendResult, WhatsAppProvider } from "./types";
export { WHATSAPP_TEMPLATES, renderTemplate, type TemplateName } from "./templates";
export { verifyWebhookSignature } from "./cloud";
export { ConsoleWhatsApp, devMessageLog } from "./console";

let cached: WhatsAppProvider | undefined;

/** Provider selected by WHATSAPP_PROVIDER (env() already checked the WA_* vars for `cloud`). */
export function whatsapp(): WhatsAppProvider {
  if (cached) return cached;
  const e = env();
  cached =
    e.WHATSAPP_PROVIDER === "cloud"
      ? new CloudWhatsApp({ phoneNumberId: e.WA_PHONE_NUMBER_ID ?? "", accessToken: e.WA_ACCESS_TOKEN ?? "", graphVersion: e.WA_GRAPH_VERSION })
      : new ConsoleWhatsApp();
  return cached;
}
