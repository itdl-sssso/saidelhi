import type { ExtractField, ExtractInput, ExtractResult, Extractor } from "./types";
import { rulesExtract } from "./rules";

export interface OllamaConfig {
  url: string;
  model: string;
  timeoutMs?: number;
  /** Overridable for tests. */
  fetch?: typeof fetch;
}

/** Rules first; the model only fills fields the rules left blank. Any failure → rules result. */
export class OllamaExtractor implements Extractor {
  constructor(private readonly cfg: OllamaConfig) {}

  async extractFields(input: ExtractInput): Promise<ExtractResult> {
    const base = rulesExtract(input);
    const missing = input.fields.filter((f) => !(f.id in base.answers) && !(f.id in base.fieldConfidence));
    if (missing.length === 0 || input.text.trim().length < 3) return base;
    try {
      const guessed = await this.ask(input.text, missing);
      const answers = { ...base.answers };
      const fieldConfidence = { ...base.fieldConfidence };
      let used = false;
      for (const f of missing) {
        const v = guessed[f.id];
        if (typeof v !== "number" || !Number.isInteger(v) || v < (f.min ?? 0) || (f.max !== null && v > f.max)) continue;
        answers[f.id] = v;
        fieldConfidence[f.id] = {
          level: "low",
          why: { en: `Read by the AI model (${this.cfg.model}). Please check it against the message.`, hi: `AI मॉडल (${this.cfg.model}) ने पढ़ा। कृपया संदेश से मिलाकर जाँच लें।` },
        };
        used = true;
      }
      return { answers, fieldConfidence, model: used ? `rules+${this.cfg.model}` : "rules" };
    } catch (err) {
      console.warn("[extractor] ollama failed, using rules only:", err instanceof Error ? err.message : err);
      return base;
    }
  }

  private async ask(text: string, fields: readonly ExtractField[]): Promise<Record<string, unknown>> {
    const list = fields.map((f) => `- ${f.id}: ${f.label.en}`).join("\n");
    const prompt =
      "You read short WhatsApp reports (English or Hinglish) about a charity activity and extract counts.\n" +
      `Fields:\n${list}\n` +
      "Reply with ONE JSON object mapping each field id to an integer, or null when the message does not say. Never guess.\n" +
      `Message:\n"""${text.slice(0, 1500)}"""\nJSON:`;
    const doFetch = this.cfg.fetch ?? fetch;
    const res = await doFetch(`${this.cfg.url.replace(/\/$/, "")}/api/generate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model: this.cfg.model, prompt, stream: false, format: "json", options: { temperature: 0 } }),
      signal: AbortSignal.timeout(this.cfg.timeoutMs ?? 20_000),
    });
    if (!res.ok) throw new Error(`ollama status ${res.status}`);
    const body: unknown = await res.json();
    const raw = typeof body === "object" && body !== null && "response" in body && typeof body.response === "string" ? body.response : "";
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) throw new Error("not an object");
    return parsed as Record<string, unknown>;
  }
}
