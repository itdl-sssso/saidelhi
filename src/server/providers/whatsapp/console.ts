import { ulid } from "ulidx";
import type { Locale } from "@/contract";
import { renderTemplate, type TemplateName } from "./templates";
import type { OutboundMessage, SendResult, WhatsAppProvider } from "./types";

/**
 * Dev provider: prints every message (OTP codes included) to the server log.
 * Persistence of the outbound log is the job of `LoggedWhatsApp` (repo.wa).
 */
export class ConsoleWhatsApp implements WhatsAppProvider {
  readonly name = "console" as const;

  constructor(private readonly log: (line: string) => void = (l) => console.info(l)) {}

  async sendTemplate(to: string, template: TemplateName, lang: Locale, params: readonly string[]): Promise<SendResult> {
    return this.record(to, `${template}/${lang}`, renderTemplate(template, lang, params));
  }

  async sendText(to: string, text: string): Promise<SendResult> {
    return this.record(to, "text", text);
  }

  async sendInteractive(to: string, message: OutboundMessage): Promise<SendResult> {
    const extra = message.buttons
      ? ` [${message.buttons.map((b) => b.title).join(" | ")}]`
      : message.list
        ? ` [list: ${message.list.sections.flatMap((s) => s.rows.map((r) => r.title)).join(" | ")}]`
        : "";
    return this.record(to, message.kind, message.text + extra);
  }

  private record(to: string, head: string, text: string): SendResult {
    this.log(`[whatsapp:console] to=${to} ${head}: ${text}`);
    return { id: `console.${ulid()}` };
  }
}
