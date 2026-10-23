import { OllamaExtractor, type OllamaConfig } from "./ollama";
import { rulesExtract } from "./rules";
import type { Extractor } from "./types";

export * from "./types";
export { detectDate, detectSevaType, eventHints, rulesExtract } from "./rules";
export { OllamaExtractor } from "./ollama";

export class RulesExtractor implements Extractor {
  async extractFields(input: Parameters<Extractor["extractFields"]>[0]) {
    return rulesExtract(input);
  }
}

export function createExtractor(provider: "rules" | "ollama", ollama: OllamaConfig): Extractor {
  return provider === "ollama" ? new OllamaExtractor(ollama) : new RulesExtractor();
}
