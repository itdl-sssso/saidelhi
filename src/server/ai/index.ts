import { extractEventByRules, type EventInput } from "./event";
import { HfExtractor, type HfConfig } from "./hf";
import { OllamaExtractor, type OllamaConfig } from "./ollama";
import { rulesExtract } from "./rules";
import type { Extractor } from "./types";

export * from "./types";
export { detectDate, detectSevaType, eventHints, rulesExtract } from "./rules";
export { extractEvent, extractEventByRules } from "./event";
export { parseDate, parseTime, parseTimeRange, resolveSamithi } from "./event/normalise";
export { OllamaExtractor } from "./ollama";
export { HfExtractor } from "./hf";

export class RulesExtractor implements Extractor {
  async extractFields(input: Parameters<Extractor["extractFields"]>[0]) {
    return rulesExtract(input);
  }

  async extractEvent(input: EventInput) {
    return extractEventByRules(input);
  }
}

export type ExtractorProvider = "rules" | "ollama" | "hf";

export function createExtractor(provider: ExtractorProvider, cfg: { ollama: OllamaConfig; hf: HfConfig }): Extractor {
  if (provider === "ollama") return new OllamaExtractor(cfg.ollama);
  if (provider === "hf") return new HfExtractor(cfg.hf);
  return new RulesExtractor();
}
