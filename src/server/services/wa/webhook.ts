// Meta webhook payload → bot messages (contract §5.5). Parsing is tolerant:
// anything it does not understand is ignored, never an error (Meta retries on 5xx).
import type { BotMedia } from "../../whatsapp/bot/types";
import type { InboundMessage } from "../../whatsapp/bot/engine";

type Json = Record<string, unknown>;
const obj = (v: unknown): Json => (typeof v === "object" && v !== null ? (v as Json) : {});
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const str = (v: unknown): string | null => (typeof v === "string" ? v : null);

export interface ParsedInbound {
  message: InboundMessage;
  /** Cloud media id to download (images, PDFs). */
  mediaId: string | null;
}

/** Extracts the inbound user messages from a webhook body. Status updates are ignored. */
export function parseWebhook(body: unknown): ParsedInbound[] {
  const out: ParsedInbound[] = [];
  for (const entry of arr(obj(body).entry)) {
    for (const change of arr(obj(entry).changes)) {
      const value = obj(obj(change).value);
      for (const m of arr(value.messages)) {
        const msg = obj(m);
        const from = str(msg.from);
        if (!from) continue;
        const base = { from, providerId: str(msg.id) ?? undefined, text: null as string | null, replyId: null as string | null, media: null as BotMedia | null };
        const type = str(msg.type);
        let mediaId: string | null = null;
        if (type === "text") base.text = str(obj(msg.text).body);
        else if (type === "interactive") {
          const i = obj(msg.interactive);
          const reply = obj(i.button_reply ?? i.list_reply);
          base.replyId = str(reply.id);
          base.text = str(reply.title);
        } else if (type === "button") {
          base.replyId = str(obj(msg.button).payload);
          base.text = str(obj(msg.button).text);
        } else if (type === "image") {
          const im = obj(msg.image);
          mediaId = str(im.id);
          base.media = { kind: "image", name: `photo-${(mediaId ?? "x").slice(-8)}.jpg`, mime: str(im.mime_type) ?? "image/jpeg" };
          base.text = str(im.caption);
        } else if (type === "document") {
          const d = obj(msg.document);
          const mime = str(d.mime_type) ?? "";
          if (mime === "application/pdf") {
            mediaId = str(d.id);
            base.media = { kind: "pdf", name: str(d.filename) ?? "document.pdf", mime };
            base.text = str(d.caption);
          }
        }
        out.push({ message: base, mediaId });
      }
    }
  }
  return out;
}
