import type { Locale } from "@/contract";
import type { WaRepo } from "../../repo/wa-types";
import { ensureConversation, recordMessage, type WaEnv } from "../../whatsapp/conversations";
import { renderTemplate, templateCostPaise, type TemplateName } from "./templates";
import type { OutboundMessage, SendMeta, SendResult, WhatsAppProvider } from "./types";

/**
 * Decorator that stores every outbound message (console and cloud alike) in
 * `whatsapp_message`, so the admin log and dev simulator read one source.
 * A failed send is stored as `failed` and rethrown.
 */
export class LoggedWhatsApp implements WhatsAppProvider {
  constructor(
    private readonly inner: WhatsAppProvider,
    private readonly repo: WaRepo,
    private readonly env: WaEnv,
  ) {}

  get name() {
    return this.inner.name;
  }

  private async log(
    to: string,
    send: () => Promise<SendResult>,
    rec: { kind: "text" | "buttons" | "list" | "template"; text: string; payload: Record<string, unknown>; template?: string; costPaise?: number },
    meta?: SendMeta,
  ): Promise<SendResult> {
    let result: SendResult | null = null;
    let failure: unknown = null;
    try {
      result = await send();
    } catch (err) {
      failure = err;
    }
    try {
      const conv = await ensureConversation(this.repo, this.env, to);
      await recordMessage(this.repo, this.env, conv, {
        dir: "out",
        kind: rec.kind,
        text: rec.text,
        payload: rec.payload,
        template: rec.template ?? null,
        providerId: result?.id ?? null,
        status: failure ? "failed" : "sent",
        costPaise: failure ? 0 : (rec.costPaise ?? 0),
        inboxItemId: meta?.inboxItemId ?? null,
      });
    } catch (err) {
      // Logging must never block or hide the actual send result.
      console.error("[whatsapp] could not log outbound message", err instanceof Error ? err.message : err);
    }
    if (failure) throw failure;
    return result as SendResult;
  }

  sendTemplate(to: string, template: TemplateName, lang: Locale, params: readonly string[], meta?: SendMeta) {
    // A login code is a credential: the stored copy never contains it.
    const stored = template === "login_code" ? params.map(() => "••••••") : params;
    const text = renderTemplate(template, lang, stored);
    return this.log(
      to,
      () => this.inner.sendTemplate(to, template, lang, params, meta),
      { kind: "template", text, payload: { kind: "template", text, template, lang }, template, costPaise: templateCostPaise(template) },
      meta,
    );
  }

  sendText(to: string, text: string, meta?: SendMeta) {
    return this.log(to, () => this.inner.sendText(to, text, meta), { kind: "text", text, payload: { kind: "text", text } }, meta);
  }

  sendInteractive(to: string, message: OutboundMessage, meta?: SendMeta) {
    return this.log(
      to,
      () => this.inner.sendInteractive(to, message, meta),
      { kind: message.kind, text: message.text, payload: { kind: message.kind, text: message.text, buttons: message.buttons, list: message.list } },
      meta,
    );
  }

  /** Cloud-only helper for the webhook (inbound media). */
  downloadMedia(mediaId: string): Promise<{ bytes: Uint8Array; mime: string } | null> {
    const inner = this.inner as { downloadMedia?: (id: string) => Promise<{ bytes: Uint8Array; mime: string } | null> };
    return inner.downloadMedia ? inner.downloadMedia(mediaId) : Promise.resolve(null);
  }
}
