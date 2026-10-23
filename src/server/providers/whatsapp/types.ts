import type { Locale, WaOutbound } from "@/contract";
import type { TemplateName } from "./templates";

export interface SendResult {
  /** Provider message id (wamid for Cloud API). */
  id: string;
}

/** Interactive or plain message the bot sends inside the 24-hour window. */
export type OutboundMessage = Pick<WaOutbound, "text" | "buttons" | "list"> & { kind: "text" | "buttons" | "list" };

/** Context the logging layer attaches to a sent message. Providers ignore it. */
export interface SendMeta {
  inboxItemId?: string;
}

/** Outgoing WhatsApp. `to` is E.164. Failures throw ApiError PROVIDER_UNAVAILABLE. */
export interface WhatsAppProvider {
  readonly name: "console" | "cloud";
  sendTemplate(to: string, template: TemplateName, lang: Locale, params: readonly string[], meta?: SendMeta): Promise<SendResult>;
  /** Free-form text; only valid inside a 24-hour customer-initiated window. */
  sendText(to: string, text: string, meta?: SendMeta): Promise<SendResult>;
  /** Buttons (≤3) or list messages; same 24-hour rule as text. */
  sendInteractive(to: string, message: OutboundMessage, meta?: SendMeta): Promise<SendResult>;
}
