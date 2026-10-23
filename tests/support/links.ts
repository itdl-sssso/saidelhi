import type { Locale } from "@/contract";
import type { PrivateStorage } from "@/server/files";
import { devLinks } from "@/server/forms/seed-data";
import type { OutboundMessage, TemplateName, WhatsAppProvider } from "@/server/providers/whatsapp";
import { MockRepo } from "@/server/repo/mock";
import { DEV_SESSION_SECRET } from "@/server/security/crypto";
import { createServices } from "@/server/services/create";
import { NOW } from "./services";

export interface Sent {
  to: string;
  template: TemplateName;
  lang: Locale;
  params: readonly string[];
  buttonRef?: string;
}

export class FakeWhatsApp implements WhatsAppProvider {
  readonly name = "console" as const;
  sent: Sent[] = [];
  texts: { to: string; text: string }[] = [];
  interactive: { to: string; message: OutboundMessage }[] = [];
  failNext = false;

  async sendTemplate(to: string, template: TemplateName, lang: Locale, params: readonly string[], meta?: { buttonRef?: string }) {
    if (this.failNext) {
      this.failNext = false;
      throw new Error("network down");
    }
    this.sent.push({ to, template, lang, params, buttonRef: meta?.buttonRef });
    return { id: `fake.${this.sent.length}` };
  }

  async sendText(to: string, text: string) {
    this.texts.push({ to, text });
    return { id: `fake.text.${this.texts.length}` };
  }

  async sendInteractive(to: string, message: OutboundMessage) {
    this.interactive.push({ to, message });
    return { id: `fake.int.${this.interactive.length}` };
  }

  lastCode(): string {
    const last = this.sent.at(-1);
    if (!last || last.template !== "login_code") throw new Error("no code sent");
    return last.params[0];
  }
}

export class MemoryStorage implements PrivateStorage {
  files = new Map<string, Uint8Array>();
  async put(rel: string, bytes: Uint8Array) {
    if (this.files.has(rel)) throw new Error("exists");
    this.files.set(rel, bytes);
  }
  async get(rel: string) {
    return this.files.get(rel) ?? null;
  }
}

export const DEV_TOKENS = Object.fromEntries(devLinks(DEV_SESSION_SECRET).map((l) => [l.key, l.token])) as Record<string, string>;

export function linkServices(start: Date = NOW) {
  let clock = start;
  const repo = new MockRepo();
  const whatsapp = new FakeWhatsApp();
  const storage = new MemoryStorage();
  const revalidated: string[] = [];
  const svc = createServices(repo, {
    now: () => clock,
    mediaBase: "/media",
    whatsapp,
    storage,
    revalidate: (tags) => revalidated.push(...tags),
  });
  return {
    repo,
    svc,
    links: svc.links,
    whatsapp,
    storage,
    revalidated,
    advance(ms: number) {
      clock = new Date(clock.getTime() + ms);
    },
  };
}
