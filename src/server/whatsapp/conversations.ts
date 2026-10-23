// Conversation + message bookkeeping shared by the logging provider, the bot and the inbox.
import { newId } from "../db/columns";
import type { WaRepo, ConversationRec, MessageKind, WaMessageRec } from "../repo/wa-types";
import { EMPTY_STATE } from "../repo/wa-types";
import { encryptField } from "../security/crypto";
import { maskPhone, phoneHash } from "../security/phone";

export interface WaEnv {
  secret: string;
  now: () => Date;
}

export const SESSION_WINDOW_MS = 24 * 60 * 60 * 1000;

/** True while free-form messages may still be sent to this number. */
export function inSessionWindow(conv: ConversationRec | null, now: Date): boolean {
  return !!conv?.lastInboundAt && now.getTime() - conv.lastInboundAt.getTime() < SESSION_WINDOW_MS;
}

export async function ensureConversation(repo: WaRepo, env: WaEnv, e164: string, userId: string | null = null): Promise<ConversationRec> {
  const hash = phoneHash(env.secret, e164);
  const found = await repo.conversationByHash(hash);
  if (found) {
    if (userId && found.userId !== userId) {
      found.userId = userId;
      await repo.saveConversation(found);
    }
    return found;
  }
  const at = env.now();
  const conv: ConversationRec = {
    id: newId(),
    phoneHash: hash,
    phoneEnc: encryptField(env.secret, e164),
    phoneMasked: maskPhone(e164),
    locale: null,
    userId,
    state: structuredClone(EMPTY_STATE),
    expiresAt: null,
    lastInboundAt: null,
    lastAt: at,
    lastText: "",
    messageCount: 0,
    createdAt: at,
  };
  await repo.saveConversation(conv);
  return conv;
}

export interface MessageInput {
  dir: "in" | "out";
  kind: MessageKind;
  text?: string | null;
  payload?: Record<string, unknown> | null;
  template?: string | null;
  providerId?: string | null;
  status?: WaMessageRec["status"];
  costPaise?: number;
  inboxItemId?: string | null;
  mediaPath?: string | null;
  mediaName?: string | null;
  mediaMime?: string | null;
}

/** Stores a message and updates the conversation's last-activity fields. */
export async function recordMessage(repo: WaRepo, env: WaEnv, conv: ConversationRec, m: MessageInput): Promise<WaMessageRec> {
  const at = env.now();
  const rec: WaMessageRec = {
    id: newId(),
    conversationId: conv.id,
    phoneHash: conv.phoneHash,
    phoneMasked: conv.phoneMasked,
    dir: m.dir,
    kind: m.kind,
    text: m.text ?? null,
    payload: m.payload ?? null,
    template: m.template ?? null,
    providerId: m.providerId ?? null,
    status: m.status ?? (m.dir === "in" ? "received" : "sent"),
    costPaise: m.costPaise ?? 0,
    inboxItemId: m.inboxItemId ?? null,
    mediaPath: m.mediaPath ?? null,
    mediaName: m.mediaName ?? null,
    mediaMime: m.mediaMime ?? null,
    createdAt: at,
  };
  await repo.insertMessage(rec);
  conv.lastAt = at;
  conv.lastText = (m.text ?? m.mediaName ?? "").replace(/\s+/g, " ").slice(0, 200);
  conv.messageCount += 1;
  if (m.dir === "in") conv.lastInboundAt = at;
  await repo.saveConversation(conv);
  return rec;
}
