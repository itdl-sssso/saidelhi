// Event messages → EventExtract draft. Rules first; when a model is given it
// is asked only for the fields still empty, and its reply goes through the
// type check + grounding in ./model.ts. Never throws: a failed model call
// leaves the rules result.
import type { EventExtract } from "@/contract";
import { parseJsonObject } from "../llm";
import { finishDraft } from "./draft";
import { eventMessages, keysToAsk, mergeModel, replyBudget, type ChatMessage, type PromptVariant } from "./model";
import { looksLikeNoEvent, rulesEvent } from "./rules";

export type { ChatMessage, PromptVariant } from "./model";
/** One greedy chat completion → the assistant's reply text. */
export type Generate = (messages: ChatMessage[], maxNewTokens: number) => Promise<string>;

export interface EventModel {
  generate: Generate;
  /** Label for the draft footer, e.g. "LFM2.5-350M-ONNX". */
  name: string;
  variant?: PromptVariant;
}

export interface EventInput {
  text: string;
  now: Date;
}

export const extractEventByRules = ({ text, now }: EventInput): EventExtract => finishDraft(rulesEvent(text, now), "rules");

export async function extractEvent({ text, now }: EventInput, model?: EventModel): Promise<EventExtract> {
  const d = rulesEvent(text, now);
  const keys = keysToAsk(d, text);
  if (!model || keys.length === 0 || text.trim().length < 3 || looksLikeNoEvent(d)) return finishDraft(d, "rules");
  let reply = "";
  try {
    reply = await model.generate(eventMessages(text, keys, now, model.variant), replyBudget(keys));
    const used = mergeModel(d, parseJsonObject(reply), keys, text, now, model.name);
    return finishDraft(d, used ? `rules+${model.name}` : "rules");
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    d.rejected.push({ field: "*", value: reply.slice(0, 120), reason });
    console.warn("[extractor] model failed, using rules only:", reason);
    return finishDraft(d, "rules");
  }
}
