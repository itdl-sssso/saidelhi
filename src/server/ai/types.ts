// Extractor port: turns a coordinator's free-text report into a draft answer
// set. Every extraction is only a draft in the review inbox; a person approves
// it before it counts (contract v0.5 #8).
import type { Confidence, I18nText, SevaType } from "@/contract";

export interface ExtractField {
  id: string;
  label: I18nText;
  min: number | null;
  max: number | null;
  required: boolean;
  /** KPI key, a strong hint for synonyms ("eye.screened"). */
  kpi: string | null;
}

export interface ExtractInput {
  text: string;
  now: Date;
  /** Numeric fields of the matched event's form. */
  fields: readonly ExtractField[];
}

export interface FieldConfidence {
  level: Confidence;
  why: I18nText | null;
}

export interface ExtractResult {
  answers: Record<string, unknown>;
  fieldConfidence: Record<string, FieldConfidence>;
  /** "rules" or "rules+smollm2:1.7b" — shown in the inbox footer. */
  model: string;
}

export interface Extractor {
  /** Fills number fields from the text. Never throws: falls back to rules. */
  extractFields(input: ExtractInput): Promise<ExtractResult>;
}

export interface DateHint {
  /** 'YYYY-MM-DD' (IST). */
  date: string;
  why: string;
}

export interface EventHints {
  date: DateHint | null;
  sevaType: SevaType | null;
}
