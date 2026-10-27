// Shared by the model adapters (Ollama, Hugging Face): the count prompt, JSON
// parsing and the merge that only lets valid integers into empty fields.
import type { ExtractField, ExtractResult } from "./types";

export function countPrompt(text: string, fields: readonly ExtractField[]): string {
  const list = fields.map((f) => `- ${f.id}: ${f.label.en}`).join("\n");
  return (
    "You read short WhatsApp reports (English or Hinglish) about a charity activity and extract counts.\n" +
    `Fields:\n${list}\n` +
    "Reply with ONE JSON object mapping each field id to an integer, or null when the message does not say. Never guess.\n" +
    `Message:\n"""${text.slice(0, 1500)}"""\nJSON:`
  );
}

/**
 * First JSON object in a model reply (small models wrap it in prose or ```json
 * fences). A reply cut off at the token limit keeps its complete `"key": value` pairs.
 */
export function parseJsonObject(raw: string): Record<string, unknown> {
  const start = raw.indexOf("{");
  if (start < 0) throw new Error("no JSON object in reply");
  const end = raw.lastIndexOf("}");
  if (end > start) {
    try {
      const parsed: unknown = JSON.parse(raw.slice(start, end + 1));
      if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) return parsed as Record<string, unknown>;
    } catch {
      // fall through to the pair scan
    }
  }
  const out: Record<string, unknown> = {};
  for (const m of raw.slice(start).matchAll(/"([a-z0-9_]+)"\s*:\s*("(?:[^"\\\n]|\\.)*"|-?\d+(?:\.\d+)?|null|true|false)\s*[,}\n]/g)) {
    out[m[1]] = JSON.parse(m[2]);
  }
  if (Object.keys(out).length === 0) throw new Error("no JSON object in reply");
  return out;
}

export function missingCountFields(base: ExtractResult, fields: readonly ExtractField[]): ExtractField[] {
  return fields.filter((f) => !(f.id in base.answers) && !(f.id in base.fieldConfidence));
}

/** Adds the model's integers for fields the rules missed; each is marked low. */
export function mergeCounts(base: ExtractResult, guessed: Record<string, unknown>, missing: readonly ExtractField[], model: string): ExtractResult {
  const answers = { ...base.answers };
  const fieldConfidence = { ...base.fieldConfidence };
  let used = false;
  for (const f of missing) {
    const v = guessed[f.id];
    if (typeof v !== "number" || !Number.isInteger(v) || v < (f.min ?? 0) || (f.max !== null && v > f.max)) continue;
    answers[f.id] = v;
    fieldConfidence[f.id] = {
      level: "low",
      why: { en: `Read by the AI model (${model}). Please check it against the message.`, hi: `AI मॉडल (${model}) ने पढ़ा। कृपया संदेश से मिलाकर जाँच लें।` },
    };
    used = true;
  }
  return { answers, fieldConfidence, model: used ? `rules+${model}` : "rules" };
}
