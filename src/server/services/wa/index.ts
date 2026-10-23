import type { SimMessage, WaOutbound } from "@/contract";
import type { AuthService } from "../auth";
import type { PortalServices } from "../portal";
import type { CentresService, EventsService } from "../types";
import { handleInbound, type InboundMessage } from "../../whatsapp/bot/engine";
import type { BotDeps } from "../../whatsapp/bot/types";
import { phoneHash, normalisePhone } from "../../security/phone";
import type { WaMessageRec } from "../../repo/wa-types";
import { createWaAdminService, type WaAdminService } from "./admin";
import { createInboxService, type InboxService } from "./inbox";
import { createOptInService, type OptInService } from "./optin";
import type { WaCtx } from "./shared";
import { parseWebhook } from "./webhook";

export type { InboxService, OptInService, WaAdminService };
export { verifyWebhookSignature } from "../../providers/whatsapp/cloud";

export interface WaServices {
  /** Runs one inbound message through the bot; returns the replies (also sent). */
  handle(msg: InboundMessage): Promise<WaOutbound[]>;
  /** Meta webhook body → bot. Returns how many messages were processed. */
  handleWebhook(body: unknown): Promise<number>;
  inbox: InboxService;
  admin: WaAdminService;
  optin: OptInService;
  /** Dev simulator support (the routes are gated to the console provider outside production). */
  dev: {
    messages(phone: string): Promise<SimMessage[]>;
    reset(phone: string): Promise<void>;
  };
}

export interface WaWiring extends WaCtx {
  portal: PortalServices;
  auth: AuthService;
  events: EventsService;
  centres: CentresService;
}

const toSim = (to: string, m: WaMessageRec): SimMessage => {
  if (m.dir === "in") return { dir: "in", at: m.createdAt.toISOString(), text: m.text, out: null };
  const p = (m.payload ?? {}) as { kind?: string; buttons?: WaOutbound["buttons"]; list?: WaOutbound["list"] };
  const kind = m.kind === "buttons" || m.kind === "list" || m.kind === "template" ? m.kind : "text";
  return {
    dir: "out",
    at: m.createdAt.toISOString(),
    text: m.text,
    out: { id: m.id, to, at: m.createdAt.toISOString(), kind, text: m.text ?? "", buttons: p.buttons ?? null, list: p.list ?? null, template: m.template },
  };
};

export function createWaServices(w: WaWiring): WaServices {
  const inbox = createInboxService(w);
  const botDeps: BotDeps = {
    repo: w.repo,
    secret: w.deps.secret,
    now: w.deps.now,
    appUrl: w.deps.appUrl,
    whatsapp: w.deps.whatsapp,
    portal: w.portal,
    links: w.links,
    auth: w.auth,
    events: w.events,
    centres: w.centres,
    ingest: (i) => inbox.ingest(i),
  };
  const downloader = w.deps.whatsapp as { downloadMedia?: (id: string) => Promise<{ bytes: Uint8Array; mime: string } | null> };

  return {
    handle: (msg) => handleInbound(botDeps, msg),

    async handleWebhook(body) {
      let n = 0;
      for (const p of parseWebhook(body)) {
        if (p.message.providerId && (await w.repo.wa.hasProviderMessage(p.message.providerId))) continue;
        if (p.mediaId && p.message.media && downloader.downloadMedia) {
          const file = await downloader.downloadMedia(p.mediaId);
          if (file) p.message.media = { ...p.message.media, bytes: file.bytes, mime: file.mime };
        }
        try {
          await handleInbound(botDeps, p.message);
          n++;
        } catch (err) {
          console.error("[webhook] message failed", err instanceof Error ? err.message : err);
        }
      }
      return n;
    },

    inbox,
    admin: createWaAdminService(w),
    optin: createOptInService(w),

    dev: {
      async messages(phone) {
        const e164 = normalisePhone(phone) ?? phone;
        const hash = phoneHash(w.deps.secret, e164);
        return (await w.repo.wa.messages({ phoneHash: hash })).map((m) => toSim(e164, m));
      },
      async reset(phone) {
        const e164 = normalisePhone(phone) ?? phone;
        await w.repo.wa.deleteConversationData(phoneHash(w.deps.secret, e164));
      },
    },
  };
}
