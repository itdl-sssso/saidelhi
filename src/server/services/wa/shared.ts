import type { Confidence, I18nText, Locale } from "@/contract";
import type { Extractor } from "../../ai/types";
import type { DataRepo } from "../../repo/types";
import { decryptField } from "../../security/crypto";
import { phoneHash } from "../../security/phone";
import { inSessionWindow } from "../../whatsapp/conversations";
import type { TemplateName } from "../../providers/whatsapp/templates";
import type { LinkServiceDeps, LinksService } from "../types";
import type { WhatsAppProvider } from "../../providers/whatsapp/types";

export interface WaCtx {
  repo: DataRepo;
  deps: LinkServiceDeps;
  links: LinksService;
  extractor: Extractor;
}

const RANK: Record<Confidence, number> = { low: 0, check: 1, high: 2 };

/** The weakest level among fields; "low" when there are none. */
export function overallConfidence(fields: Record<string, { level: Confidence }>, matched: boolean): Confidence {
  const levels = Object.values(fields).map((f) => f.level);
  if (!matched || levels.length === 0) return "low";
  return levels.reduce((a, b) => (RANK[a] <= RANK[b] ? a : b));
}

export const loc = (t: I18nText, l: Locale) => (l === "hi" ? t.hi : null) ?? t.en;

/**
 * Tells a person something on WhatsApp: free text inside their 24-hour window,
 * the generic `review_message` template outside it. Returns false when the send failed.
 */
export async function messageSender(
  ctx: WaCtx,
  sealedPhone: string | null,
  text: (l: Locale) => string,
  meta: { inboxItemId?: string },
): Promise<boolean> {
  const phone = sealedPhone ? decryptField(ctx.deps.secret, sealedPhone) : null;
  if (!phone) return false;
  const wa: WhatsAppProvider = ctx.deps.whatsapp;
  try {
    const conv = await ctx.repo.wa.conversationByHash(phoneHash(ctx.deps.secret, phone));
    const l: Locale = conv?.locale ?? "en";
    if (inSessionWindow(conv, ctx.deps.now())) await wa.sendText(phone, text(l), meta);
    else await wa.sendTemplate(phone, "review_message" satisfies TemplateName, l, [text(l)], meta);
    return true;
  } catch (err) {
    console.error("[inbox] could not message sender", err instanceof Error ? err.message : err);
    return false;
  }
}
