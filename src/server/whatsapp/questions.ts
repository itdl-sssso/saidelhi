// Which form fields a chat or an AI draft fills: the number fields of the
// report form that are not prefilled, read-only or personal (spec 50 flow 5).
import type { AnswerMap, FormDefinition, FormField, Rule } from "@/contract";

export function ruleHolds(rule: Rule, answers: AnswerMap): boolean {
  const v = answers[rule.field];
  switch (rule.op) {
    case "filled":
      return v !== undefined && v !== null && v !== "";
    case "eq":
      return v === rule.value;
    case "neq":
      return v !== rule.value;
    case "in":
      return Array.isArray(rule.value) && rule.value.includes(v);
    default: {
      if (typeof v !== "number" || typeof rule.value !== "number") return false;
      return rule.op === "gt" ? v > rule.value : rule.op === "gte" ? v >= rule.value : rule.op === "lt" ? v < rule.value : v <= rule.value;
    }
  }
}

/** Number questions in form order, honouring show-if rules against `answers`. */
export function chatQuestions(def: FormDefinition, answers: AnswerMap): FormField[] {
  const out: FormField[] = [];
  for (const s of def.sections) {
    if (s.personalData) continue;
    for (const f of s.fields) {
      if (f.kind !== "number" || f.readOnly || f.prefill || f.personal) continue;
      if (f.showIf && !ruleHolds(f.showIf, answers)) continue;
      out.push(f);
    }
  }
  return out;
}
