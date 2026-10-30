import type { ExtractField, ExtractInput, ExtractResult, Extractor } from "./types";
import { extractEvent, type ChatMessage, type EventInput } from "./event";
import { countPrompt, mergeCounts, missingCountFields, parseJsonObject } from "./llm";
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
    const missing = missingCountFields(base, input.fields);
    if (missing.length === 0 || input.text.trim().length < 3) return base;
    try {
      return mergeCounts(base, await this.ask(input.text, missing), missing, this.cfg.model);
    } catch (err) {
      console.warn("[extractor] ollama failed, using rules only:", err instanceof Error ? err.message : err);
      return base;
    }
  }

  async extractEvent(input: EventInput) {
    return extractEvent(input, { generate: (m, n) => this.chat(m, n), name: this.cfg.model });
  }

  private async chat(messages: ChatMessage[], maxNewTokens: number): Promise<string> {
    const doFetch = this.cfg.fetch ?? fetch;
    const res = await doFetch(`${this.cfg.url.replace(/\/$/, "")}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model: this.cfg.model, messages, stream: false, format: "json", options: { temperature: 0, num_predict: maxNewTokens } }),
      signal: AbortSignal.timeout(this.cfg.timeoutMs ?? 20_000),
    });
    if (!res.ok) throw new Error(`ollama status ${res.status}`);
    const body: unknown = await res.json();
    const msg = typeof body === "object" && body !== null && "message" in body ? body.message : null;
    return typeof msg === "object" && msg !== null && "content" in msg && typeof msg.content === "string" ? msg.content : "";
  }

  private async ask(text: string, fields: readonly ExtractField[]): Promise<Record<string, unknown>> {
    const doFetch = this.cfg.fetch ?? fetch;
    const res = await doFetch(`${this.cfg.url.replace(/\/$/, "")}/api/generate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model: this.cfg.model, prompt: countPrompt(text, fields), stream: false, format: "json", options: { temperature: 0 } }),
      signal: AbortSignal.timeout(this.cfg.timeoutMs ?? 20_000),
    });
    if (!res.ok) throw new Error(`ollama status ${res.status}`);
    const body: unknown = await res.json();
    const raw = typeof body === "object" && body !== null && "response" in body && typeof body.response === "string" ? body.response : "";
    return parseJsonObject(raw);
  }
}
