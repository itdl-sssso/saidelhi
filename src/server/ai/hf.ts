// Hugging Face adapter: runs a small chat model (default LFM2.5-350M ONNX) in this Node
// process through transformers.js. No Ollama, no network after the first
// download, messages never leave the server. Rules always run first; the model
// only fills what they left blank, and any failure falls back to the rules.
import { extractEvent, type ChatMessage, type EventInput, type Generate, type PromptVariant } from "./event";
import { countPrompt, mergeCounts, missingCountFields, parseJsonObject } from "./llm";
import { rulesExtract } from "./rules";
import type { ExtractInput, ExtractResult, Extractor } from "./types";

export type { ChatMessage, Generate } from "./event";

export interface HfConfig {
  /** Hub id of an ONNX text-generation model, e.g. "onnx-community/LFM2.5-350M-ONNX". */
  model: string;
  /** Weight precision; "q4" keeps a ~350M model at ~300–400 MB on disk and ~1 GB RAM. */
  dtype: string;
  /** Where downloaded weights live (defaults to transformers.js' own cache). */
  cacheDir?: string;
  timeoutMs?: number;
  /** Prompt shape for event messages (evals compare them). */
  variant?: PromptVariant;
  /** Overridable for tests: skips loading transformers.js. */
  generate?: Generate;
}

// One model per process, loaded on first use; calls run one at a time so a
// burst of messages cannot multiply CPU and memory on a small server.
const loaded = new Map<string, Promise<Generate>>();
let queue: Promise<unknown> = Promise.resolve();

/** Loads the model once per call; the extractor caches it. Exported for the eval runner. */
export async function loadHfModel(cfg: HfConfig): Promise<Generate> {
  const tf = await import("@huggingface/transformers");
  if (cfg.cacheDir) tf.env.cacheDir = cfg.cacheDir;
  const pipe = await tf.pipeline("text-generation", cfg.model, { dtype: cfg.dtype as "q4" });
  return async (messages, maxNewTokens) => {
    const out = (await pipe(messages, { max_new_tokens: maxNewTokens, do_sample: false })) as { generated_text: ChatMessage[] | string }[];
    const g = out[0]?.generated_text;
    return Array.isArray(g) ? (g.at(-1)?.content ?? "") : (g ?? "");
  };
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`timed out after ${ms} ms`)), ms);
  });
  return Promise.race([p, timeout]).finally(() => clearTimeout(timer));
}

export class HfExtractor implements Extractor {
  constructor(private readonly cfg: HfConfig) {}

  private run(messages: ChatMessage[], maxNewTokens: number): Promise<string> {
    const job = queue.then(async () => {
      if (this.cfg.generate) return this.cfg.generate(messages, maxNewTokens);
      let gen = loaded.get(this.cfg.model);
      if (!gen) {
        gen = loadHfModel(this.cfg);
        loaded.set(this.cfg.model, gen);
        gen.catch(() => loaded.delete(this.cfg.model));
      }
      return (await gen)(messages, maxNewTokens);
    });
    queue = job.catch(() => undefined);
    // The first call includes the download/load; the timeout covers the reply only after that.
    return withTimeout(job, (this.cfg.timeoutMs ?? 60_000) * (loaded.has(this.cfg.model) || this.cfg.generate ? 1 : 10));
  }

  async extractFields(input: ExtractInput): Promise<ExtractResult> {
    const base = rulesExtract(input);
    const missing = missingCountFields(base, input.fields);
    if (missing.length === 0 || input.text.trim().length < 3) return base;
    try {
      const reply = await this.run([{ role: "user", content: countPrompt(input.text, missing) }], 120);
      return mergeCounts(base, parseJsonObject(reply), missing, this.cfg.model);
    } catch (err) {
      console.warn("[extractor] hf failed, using rules only:", err instanceof Error ? err.message : err);
      return base;
    }
  }

  async extractEvent(input: EventInput) {
    const name = this.cfg.model.split("/").at(-1) ?? this.cfg.model;
    return extractEvent(input, { generate: (m, n) => this.run(m, n), name, variant: this.cfg.variant });
  }
}
