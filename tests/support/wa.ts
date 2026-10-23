import type { WaOutbound } from "@/contract";
import { EVENT, USER, devUserPhone } from "@/server/mock/fixtures";
import { MockRepo } from "@/server/repo/mock";
import { createServices } from "@/server/services/create";
import { FakeWhatsApp, MemoryStorage } from "./links";
import { NOW } from "./services";

export const PUBLIC_PHONE = "+919812345670";
export const phone = (n: number) => devUserPhone(n);
export { EVENT, USER };

/** Services over the in-memory repo with a controllable clock and a recording WhatsApp. */
export function waSetup(start: Date = NOW) {
  const clock = { t: start };
  const repo = new MockRepo();
  const whatsapp = new FakeWhatsApp();
  const storage = new MemoryStorage();
  const svc = createServices(repo, { now: () => clock.t, mediaBase: "/media", whatsapp, storage });
  const rc = { requestId: "t", ipHash: null };
  const actor = async (userId: string) => (await svc.auth.actorFor(userId, rc))!;

  /** One message from `from`; returns the bot's replies. */
  const say = (from: string, text: string | null, replyId: string | null = null, media: { kind: "image" | "pdf"; name: string } | null = null) =>
    svc.wa.handle({ from, text, replyId, media });

  return {
    repo,
    svc,
    whatsapp,
    storage,
    clock,
    rc,
    actor,
    say,
    tap: (from: string, replyId: string) => say(from, null, replyId),
    advance: (ms: number) => {
      clock.t = new Date(clock.t.getTime() + ms);
    },
  };
}

export const texts = (replies: WaOutbound[]) => replies.map((r) => r.text).join("\n");
export const buttonIds = (replies: WaOutbound[]) => replies.flatMap((r) => r.buttons?.map((b) => b.id) ?? []);
export const rowIds = (replies: WaOutbound[]) => replies.flatMap((r) => r.list?.sections.flatMap((s) => s.rows.map((x) => x.id)) ?? []);
