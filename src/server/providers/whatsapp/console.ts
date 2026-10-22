import { ulid } from "ulidx";
import type { Locale } from "@/contract";
import { renderTemplate, type TemplateName } from "./templates";
import type { DevMessage, SendResult, WhatsAppProvider } from "./types";

const MAX_LOG = 200;

// Survives dev HMR; read by the future /admin/whatsapp simulator.
const holder = globalThis as unknown as { __saidelhiWaDevLog?: DevMessage[] };

export function devMessageLog(): readonly DevMessage[] {
  return holder.__saidelhiWaDevLog ?? [];
}

export function clearDevMessageLog(): void {
  holder.__saidelhiWaDevLog = [];
}

/** Dev provider: prints every message (OTP codes included) to the server log. */
export class ConsoleWhatsApp implements WhatsAppProvider {
  readonly name = "console" as const;

  constructor(private readonly log: (line: string) => void = (l) => console.info(l)) {}

  async sendTemplate(to: string, template: TemplateName, lang: Locale, params: readonly string[]): Promise<SendResult> {
    return this.record({ to, kind: "template", template, lang, params, text: renderTemplate(template, lang, params) });
  }

  async sendText(to: string, text: string): Promise<SendResult> {
    return this.record({ to, kind: "text", template: null, lang: null, params: [], text });
  }

  private record(m: Omit<DevMessage, "id" | "at">): SendResult {
    const msg: DevMessage = { ...m, id: `console.${ulid()}`, at: new Date() };
    const log = (holder.__saidelhiWaDevLog ??= []);
    log.push(msg);
    if (log.length > MAX_LOG) log.splice(0, log.length - MAX_LOG);
    const head = msg.template ? `${msg.template}/${msg.lang}` : "text";
    this.log(`[whatsapp:console] to=${msg.to} ${head}: ${msg.text}`);
    return { id: msg.id };
  }
}
