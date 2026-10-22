import type { Locale } from "@/contract";
import type { TemplateName } from "./templates";

export interface SendResult {
  /** Provider message id (wamid for Cloud API). */
  id: string;
}

/** Outgoing WhatsApp. `to` is E.164. Failures throw ApiError PROVIDER_UNAVAILABLE. */
export interface WhatsAppProvider {
  readonly name: "console" | "cloud";
  sendTemplate(to: string, template: TemplateName, lang: Locale, params: readonly string[]): Promise<SendResult>;
  /** Free-form text; only valid inside a 24-hour customer-initiated window. */
  sendText(to: string, text: string): Promise<SendResult>;
}

export interface DevMessage {
  id: string;
  at: Date;
  to: string;
  kind: "template" | "text";
  template: TemplateName | null;
  lang: Locale | null;
  params: readonly string[];
  text: string;
}
