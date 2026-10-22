import { createHmac } from "node:crypto";
import type { Locale } from "@/contract";
import { ApiError } from "../../http/errors";
import { safeEqual } from "../../security/crypto";
import { WHATSAPP_TEMPLATES, type TemplateName } from "./templates";
import type { SendResult, WhatsAppProvider } from "./types";

export interface CloudConfig {
  phoneNumberId: string;
  accessToken: string;
  graphVersion: string;
  /** Overridable for tests. */
  fetch?: typeof fetch;
  timeoutMs?: number;
}

type Component =
  | { type: "body"; parameters: { type: "text"; text: string }[] }
  | { type: "button"; sub_type: "url"; index: string; parameters: { type: "text"; text: string }[] };

/** Meta WhatsApp Cloud API (graph.facebook.com/{version}/{phone-number-id}/messages). */
export class CloudWhatsApp implements WhatsAppProvider {
  readonly name = "cloud" as const;

  constructor(private readonly cfg: CloudConfig) {}

  async sendTemplate(to: string, template: TemplateName, lang: Locale, params: readonly string[]): Promise<SendResult> {
    const text = params.map((p) => ({ type: "text" as const, text: p }));
    const components: Component[] = [{ type: "body", parameters: text }];
    // Authentication templates carry the code again on their copy-code button.
    if (WHATSAPP_TEMPLATES[template].category === "authentication") {
      components.push({ type: "button", sub_type: "url", index: "0", parameters: [text[0]] });
    }
    return this.post({ type: "template", template: { name: template, language: { code: lang }, components } }, to);
  }

  async sendText(to: string, text: string): Promise<SendResult> {
    return this.post({ type: "text", text: { preview_url: false, body: text } }, to);
  }

  private async post(message: Record<string, unknown>, to: string): Promise<SendResult> {
    const url = `https://graph.facebook.com/${this.cfg.graphVersion}/${encodeURIComponent(this.cfg.phoneNumberId)}/messages`;
    const doFetch = this.cfg.fetch ?? fetch;
    let res: Response;
    try {
      res = await doFetch(url, {
        method: "POST",
        headers: { authorization: `Bearer ${this.cfg.accessToken}`, "content-type": "application/json" },
        body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", to: to.replace(/^\+/, ""), ...message }),
        signal: AbortSignal.timeout(this.cfg.timeoutMs ?? 10_000),
      });
    } catch (cause) {
      throw new ApiError("PROVIDER_UNAVAILABLE", { cause });
    }
    const body: unknown = await res.json().catch(() => null);
    const id = readMessageId(body);
    if (!res.ok || !id) {
      console.error(`[whatsapp:cloud] send failed status=${res.status}`, readError(body));
      throw new ApiError("PROVIDER_UNAVAILABLE");
    }
    return { id };
  }
}

function readMessageId(body: unknown): string | null {
  if (typeof body !== "object" || body === null || !("messages" in body) || !Array.isArray(body.messages)) return null;
  const first: unknown = body.messages[0];
  return typeof first === "object" && first !== null && "id" in first && typeof first.id === "string" ? first.id : null;
}

function readError(body: unknown): unknown {
  return typeof body === "object" && body !== null && "error" in body ? body.error : body;
}

/** Verifies Meta's `X-Hub-Signature-256: sha256=<hex>` over the raw request body. */
export function verifyWebhookSignature(rawBody: string | Buffer, header: string | null, appSecret: string): boolean {
  if (!header?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", appSecret).update(rawBody).digest("hex");
  return safeEqual(header.slice(7).toLowerCase(), expected);
}
