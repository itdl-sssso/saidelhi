// v0.7 (M6): pure helpers shared by the form builder (spec 31, live previews in the
// browser), the Excel template/upload parser (spec 33) and the WhatsApp report flow
// (spec 50). One definition feeds all of them, so the derivations live here.
import { z } from "zod";
import type { FormDefinition, FormField, Rule } from "./forms";
import { isValueField, lintDefinition, type AnswerMap } from "./form-rules";

/** Core fields every report template keeps (locked, cannot be removed). "People served" is derived from `served` KPIs. */
export const CORE_FIELD_IDS = ["samithi", "date", "venue", "volunteers", "volunteer_hours"] as const;
export type CoreFieldId = (typeof CORE_FIELD_IDS)[number];

/** Builder palette (spec 31 left panel). There is deliberately no ID-number type. */
export const PALETTE_KINDS = ["number", "text", "date", "time", "select", "multiselect", "yesno", "repeater", "file", "heading", "help"] as const;

/** Default retention (days) for personal answers when a field sets none. */
export const DEFAULT_PERSONAL_RETENTION_DAYS = 365;

/** Label/field ids that look like an ID-number field (Aadhaar, PAN, voter id…): blocked at publish. */
export const ID_NUMBER_PATTERN = /\b(aadha?ar|pan\s*(card|no|number)?|voter\s*id|passport|ration\s*card\s*no|id\s*(no|number))\b/i;

export const BuilderCheckKey = z.enum(["structure", "core_fields", "kpi_unique", "hi_labels", "personal_consent", "personal_retention", "no_id_numbers"]);
export type BuilderCheckKey = z.infer<typeof BuilderCheckKey>;

/** One line of the "Checks before publish" list. `level: error` blocks publish. */
export const BuilderCheck = z.object({
  key: BuilderCheckKey,
  ok: z.boolean(),
  level: z.enum(["error", "warn"]),
  /** Field ids to highlight on the canvas. */
  fieldIds: z.array(z.string()),
  /** Technical detail (structure problems); UI copy comes from messages keyed by `key`. */
  detail: z.array(z.string()),
});
export type BuilderCheck = z.infer<typeof BuilderCheck>;

/** One column of the Excel template / upload sheet. */
export const ExcelColumn = z.object({
  /** Header text in row 1 (stable snake_case; the upload parser matches on it). */
  header: z.string(),
  fieldId: z.string(),
  kind: z.string(),
  locked: z.boolean(),
  required: z.boolean(),
});
export type ExcelColumn = z.infer<typeof ExcelColumn>;

const walk = (fields: readonly FormField[], fn: (f: FormField, parent: FormField | null) => void, parent: FormField | null = null) => {
  for (const f of fields) {
    fn(f, parent);
    if (f.fields) walk(f.fields, fn, f);
  }
};

const allFields = (def: FormDefinition) => {
  const out: { f: FormField; parent: FormField | null; personalSection: boolean }[] = [];
  for (const s of def.sections) walk(s.fields, (f, parent) => out.push({ f, parent, personalSection: s.personalData }));
  return out;
};

/** Number of value fields (headings/help excluded), counting repeater children. */
export const fieldCount = (def: FormDefinition) => allFields(def).filter(({ f }) => isValueField(f)).length;

/** Value fields whose Hindi label (or Hindi help, when English help exists) is missing. */
export function missingHindi(def: FormDefinition): string[] {
  const out: string[] = [];
  for (const { f } of allFields(def)) {
    const noLabel = !f.label.hi?.trim();
    const noHelp = !!f.help?.en.trim() && !f.help.hi?.trim();
    const noOpt = (f.options ?? []).some((o) => !o.label.hi?.trim());
    if (noLabel || noHelp || noOpt) out.push(f.id);
  }
  for (const s of def.sections) if (!s.title.hi?.trim()) out.push(`section:${s.id}`);
  return out;
}

/** Spec 31 "Checks before publish". Publish is allowed only when no `error` check fails. */
export function builderChecks(def: FormDefinition, opts: { purpose?: "report" | "desk" | "public" } = {}): BuilderCheck[] {
  const fields = allFields(def);
  const top = new Map(def.sections.flatMap((s) => s.fields).map((f) => [f.id, f]));
  const check = (key: BuilderCheckKey, level: "error" | "warn", fieldIds: string[], detail: string[] = []): BuilderCheck => ({
    key,
    ok: fieldIds.length === 0 && detail.length === 0,
    level,
    fieldIds,
    detail,
  });

  const structure = lintDefinition(def);
  const coreMissing = (opts.purpose ?? "report") === "report" ? CORE_FIELD_IDS.filter((id) => !top.get(id)?.locked) : [];

  const kpiSeen = new Map<string, string[]>();
  for (const { f } of fields) if (f.kpi) kpiSeen.set(f.kpi, [...(kpiSeen.get(f.kpi) ?? []), f.id]);
  const kpiDupes = [...kpiSeen.values()].filter((ids) => ids.length > 1).flat();

  const personal = fields.filter(({ f, personalSection }) => f.personal || personalSection);
  const noRetention = personal.filter(({ f }) => f.personal && isValueField(f) && f.kind !== "repeater" && f.retentionDays === undefined).map(({ f }) => f.id);
  const consentProblems = structure.filter((p) => p.includes("without a consent field"));

  const idLike = fields.filter(({ f }) => ID_NUMBER_PATTERN.test(`${f.id} ${f.label.en}`)).map(({ f }) => f.id);

  return [
    check("structure", "error", [], structure.filter((p) => !consentProblems.includes(p))),
    check("core_fields", "error", [...coreMissing]),
    check("kpi_unique", "error", kpiDupes),
    check("hi_labels", "error", missingHindi(def)),
    check("personal_consent", "error", [], consentProblems),
    // Retention falls back to DEFAULT_PERSONAL_RETENTION_DAYS, so this only warns.
    check("personal_retention", "warn", noRetention),
    check("no_id_numbers", "error", idLike),
  ];
}

export const canPublish = (checks: readonly BuilderCheck[]) => checks.every((c) => c.ok || c.level === "warn");

/**
 * Excel template columns, in form order: top-level, non-personal value fields
 * that are not files or repeaters (repeaters, photos and personal lists are not in Excel).
 * `samithi` becomes `samithi_code`.
 */
export function excelColumns(def: FormDefinition): ExcelColumn[] {
  const out: ExcelColumn[] = [];
  for (const s of def.sections) {
    if (s.personalData) continue;
    for (const f of s.fields) {
      if (!isValueField(f) || f.personal || f.kind === "repeater" || f.kind === "file") continue;
      out.push({ header: f.id === "samithi" ? "samithi_code" : f.id, fieldId: f.id, kind: f.kind, locked: f.locked, required: f.required });
    }
  }
  return out;
}

/** Show-if evaluation (same semantics as the form renderer). */
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

/**
 * WhatsApp report questions (spec 50 flow 5): number fields that are not prefilled,
 * read-only or personal, in form order, honouring show-if against `answers`
 * (pass `{}` for the builder preview). Server `whatsapp/questions.ts` re-exports this.
 */
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
