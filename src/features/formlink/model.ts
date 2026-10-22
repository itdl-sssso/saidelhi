// Pure helpers behind the generic form renderer (spec 20). No React, no browser APIs:
// unit-tested in tests/formlink-model.test.ts. Validation itself is the shared engine
// in src/contract/form-rules.ts; this file only adapts it to what the screen needs.
import {
  type AnswerMap,
  type CrossRule,
  type FormDefinition,
  type FormField,
  type FormIssue,
  type FormSection,
  type FormValidation,
  type I18nText,
  type Rule,
  isBlank,
  isValueField,
  parseKpiRef,
  validateAnswers,
} from "@/contract";

export type Lang = "en" | "hi";

export const pick = (t: I18nText, lang: Lang) => (lang === "hi" && t.hi ? t.hi : t.en);

/** Prefix of attachment ids that only exist on this phone (photo taken offline, not uploaded yet). */
export const LOCAL_FILE_PREFIX = "local-";
export const isLocalFileId = (v: unknown): v is string => typeof v === "string" && v.startsWith(LOCAL_FILE_PREFIX);

// ---- Visibility (mirrors the engine's showIf semantics) ----------------------

function compare(op: Rule["op"], a: unknown, b: unknown): boolean {
  switch (op) {
    case "eq":
      return a === b;
    case "neq":
      return a !== b;
    case "in":
      return Array.isArray(b) && b.includes(a);
    case "filled":
      return !isBlank(a);
  }
  if (typeof a !== "number" || typeof b !== "number") return false;
  switch (op) {
    case "gt":
      return a > b;
    case "gte":
      return a >= b;
    case "lt":
      return a < b;
    case "lte":
      return a <= b;
  }
}

export interface Scope {
  top: AnswerMap;
  topFields: Map<string, FormField>;
  row?: AnswerMap;
  rowFields?: Map<string, FormField>;
}

export function scopeOf(def: FormDefinition, answers: AnswerMap): Scope {
  return { top: answers, topFields: new Map(def.sections.flatMap((s) => s.fields).map((f) => [f.id, f])) };
}

export function rowScope(scope: Scope, repeater: FormField, row: AnswerMap): Scope {
  return { ...scope, row, rowFields: new Map((repeater.fields ?? []).map((f) => [f.id, f])) };
}

function lookup(id: string, s: Scope): { field: FormField | undefined; value: unknown } {
  if (s.row && s.rowFields?.has(id)) return { field: s.rowFields.get(id), value: s.row[id] };
  return { field: s.topFields.get(id), value: s.top[id] };
}

/** Whether a field is shown, given the current answers (same rule as the server). */
export function isVisible(f: FormField, s: Scope, depth = 0): boolean {
  if (!f.showIf) return true;
  if (depth > 10) return false;
  const { field, value } = lookup(f.showIf.field, s);
  if (!field || !isVisible(field, s, depth + 1)) return false;
  const v = Array.isArray(value) && f.showIf.op !== "filled" ? value.length : value;
  return compare(f.showIf.op, v ?? null, f.showIf.value);
}

// ---- Issues ----------------------------------------------------------------

export interface FieldIssues {
  errors: I18nText[];
  warnings: I18nText[];
}

/** Top-level field id of an issue path (`followup.0.name` → `followup`). */
export const rootOf = (path: string) => path.split(".")[0];

/** fieldId → section index. */
export function sectionIndexById(def: FormDefinition): Map<string, number> {
  const m = new Map<string, number>();
  def.sections.forEach((s, i) => s.fields.forEach((f) => m.set(f.id, i)));
  return m;
}

/**
 * Cross rules whose left side is a sum ("p_1_0+p_1_5+…") render as one live
 * "adds up to" check under the last field of the sum, not on the field that owns the rule.
 */
export interface SumCheck {
  /** Field that owns the rule (its issue path). */
  owner: string;
  rule: CrossRule;
  parts: string[];
  /** Field id (or number) the sum is compared against. */
  target: string | number;
  /** Render after this field. */
  anchor: string;
}

export function sumChecks(section: FormSection): SumCheck[] {
  const out: SumCheck[] = [];
  const ids = new Set(section.fields.map((f) => f.id));
  for (const f of section.fields) {
    for (const rule of f.checks ?? []) {
      if (rule.op !== "eq" || !rule.left.includes("+")) continue;
      const parts = rule.left.split("+").map((x) => x.trim()).filter(Boolean);
      if (!parts.every((p) => ids.has(p))) continue;
      const order = section.fields.map((x) => x.id);
      const anchor = parts.reduce((a, b) => (order.indexOf(b) > order.indexOf(a) ? b : a), parts[0]);
      out.push({ owner: f.id, rule, parts, target: rule.right, anchor });
    }
  }
  return out;
}

export interface SumState {
  sum: number;
  total: number | null;
  /** No part filled yet. */
  blank: boolean;
  matches: boolean;
}

export function sumState(check: SumCheck, s: Scope): SumState {
  let sum = 0;
  let blank = true;
  for (const id of check.parts) {
    const { field, value } = lookup(id, s);
    if (field && isVisible(field, s) && typeof value === "number") {
      sum += value;
      blank = false;
    }
  }
  const total = typeof check.target === "number" ? check.target : (() => {
    const v = lookup(check.target, s).value;
    return typeof v === "number" ? v : null;
  })();
  return { sum, total, blank, matches: total !== null && sum === total };
}

/** Issues grouped by path; sum-rule issues are keyed `sum:<owner>` so they render at the sum check. */
export function groupIssues(def: FormDefinition, v: Pick<FormValidation, "errors" | "warnings">): Map<string, FieldIssues> {
  const sums = new Set<string>();
  for (const s of def.sections) for (const c of sumChecks(s)) sums.add(`${c.owner}|${c.rule.message.en}`);
  const out = new Map<string, FieldIssues>();
  const add = (i: FormIssue, kind: keyof FieldIssues) => {
    const key = i.code === "cross" && sums.has(`${i.path}|${i.message.en}`) ? `sum:${i.path}` : i.path;
    const cur = out.get(key) ?? { errors: [], warnings: [] };
    cur[kind].push(i.message);
    out.set(key, cur);
  };
  v.errors.forEach((i) => add(i, "errors"));
  v.warnings.forEach((i) => add(i, "warnings"));
  return out;
}

/**
 * Runs the shared engine with photos that are still on this phone treated as attached
 * (they upload before the report is sent), so they don't show "Attach the file again".
 */
export function validateLocal(def: FormDefinition, answers: AnswerMap): FormValidation {
  const swapped: AnswerMap = { ...answers };
  for (const f of def.sections.flatMap((s) => s.fields)) {
    const v = swapped[f.id];
    if (f.kind === "file" && Array.isArray(v)) swapped[f.id] = v.map((x) => (isLocalFileId(x) ? `pending_${String(x).slice(LOCAL_FILE_PREFIX.length, 40)}` : x));
  }
  return validateAnswers(def, swapped);
}

/** Section indexes that have at least one blocking error. */
export function sectionsWithErrors(def: FormDefinition, errors: readonly { path: string }[]): Set<number> {
  const idx = sectionIndexById(def);
  const out = new Set<number>();
  for (const e of errors) {
    const i = idx.get(rootOf(e.path));
    if (i !== undefined) out.add(i);
  }
  return out;
}

/** Paths of errors in one section, in field order (for "focus first error"). */
export function errorPathsInSection(def: FormDefinition, sectionIndex: number, errors: readonly { path: string }[]): string[] {
  const order = def.sections[sectionIndex]?.fields.map((f) => f.id) ?? [];
  return errors
    .filter((e) => order.includes(rootOf(e.path)))
    .map((e) => e.path)
    .sort((a, b) => order.indexOf(rootOf(a)) - order.indexOf(rootOf(b)));
}

// ---- Answers -----------------------------------------------------------------

/** Read-only prefilled fields always show the event's value (the server ignores edits). */
export function applyReadOnly(def: FormDefinition, answers: AnswerMap, prefill: AnswerMap): AnswerMap {
  const out = { ...answers };
  for (const f of def.sections.flatMap((s) => s.fields)) {
    if (f.readOnly && f.prefill && prefill[f.id] !== undefined) out[f.id] = prefill[f.id];
  }
  return out;
}

const rowBlank = (fields: readonly FormField[], row: AnswerMap) => fields.every((c) => isBlank(row[c.id]));

/**
 * What gets sent: fully blank repeater rows dropped (so row numbers match the
 * server's error paths), blank values removed. Hidden fields stay; the server drops them.
 */
export function payloadAnswers(def: FormDefinition, answers: AnswerMap): AnswerMap {
  const out: AnswerMap = {};
  for (const f of def.sections.flatMap((s) => s.fields)) {
    if (!isValueField(f)) continue;
    const v = answers[f.id];
    if (f.kind === "repeater") {
      const rows = Array.isArray(v) ? (v as AnswerMap[]).filter((r) => r && !rowBlank(f.fields ?? [], r)) : [];
      if (rows.length) out[f.id] = rows.map((r) => Object.fromEntries(Object.entries(r).filter(([, x]) => !isBlank(x))));
    } else if (!isBlank(v)) out[f.id] = v;
  }
  return out;
}

/** Drops blank repeater rows in the draft itself (before sending), keeping UI rows aligned with server paths. */
export function pruneBlankRows(def: FormDefinition, answers: AnswerMap): AnswerMap {
  const out = { ...answers };
  for (const f of def.sections.flatMap((s) => s.fields)) {
    if (f.kind !== "repeater" || !Array.isArray(out[f.id])) continue;
    out[f.id] = (out[f.id] as AnswerMap[]).filter((r) => r && !rowBlank(f.fields ?? [], r));
  }
  return out;
}

/** Sets a value at `id` or `repeater.row.child`. */
export function setAnswer(answers: AnswerMap, path: string, value: unknown): AnswerMap {
  const [root, row, child] = path.split(".");
  if (row === undefined) return { ...answers, [root]: value };
  const rows = Array.isArray(answers[root]) ? [...(answers[root] as AnswerMap[])] : [];
  const i = Number(row);
  rows[i] = { ...(rows[i] ?? {}), [child]: value };
  return { ...answers, [root]: rows };
}

export function getAnswer(answers: AnswerMap, path: string): unknown {
  const [root, row, child] = path.split(".");
  if (row === undefined) return answers[root];
  const rows = answers[root];
  return Array.isArray(rows) ? (rows[Number(row)] as AnswerMap | undefined)?.[child] : undefined;
}

/** Deep-ish equality for answer maps (JSON values only). */
export function sameAnswers(a: AnswerMap, b: AnswerMap): boolean {
  const norm = (x: unknown): unknown => {
    if (Array.isArray(x)) return x.map(norm);
    if (x && typeof x === "object") {
      return Object.fromEntries(
        Object.entries(x as Record<string, unknown>)
          .filter(([, v]) => !isBlank(v))
          .sort(([k1], [k2]) => (k1 < k2 ? -1 : 1))
          .map(([k, v]) => [k, norm(v)]),
      );
    }
    return x;
  };
  return JSON.stringify(norm(a)) === JSON.stringify(norm(b));
}

// ---- Display -----------------------------------------------------------------

export interface DisplayCtx {
  lang: Lang;
  yes: string;
  no: string;
  formatDate: (iso: string) => string;
  formatTime: (hhmm: string) => string;
  /** Text for file answers, e.g. "1 photo". */
  files: (n: number) => string;
  /** Number formatting (Indian grouping). */
  number: (n: number) => string;
}

/** A human value for the review summary; null when blank. */
export function displayValue(f: FormField, v: unknown, ctx: DisplayCtx): string | null {
  if (isBlank(v)) return null;
  switch (f.kind) {
    case "number":
      return typeof v === "number" ? ctx.number(v) : String(v);
    case "yesno":
      return v === true ? ctx.yes : v === false ? ctx.no : null;
    case "date":
      return typeof v === "string" ? ctx.formatDate(v) : null;
    case "time":
      return typeof v === "string" ? ctx.formatTime(v) : null;
    case "select": {
      const o = f.options?.find((x) => x.value === v);
      return o ? pick(o.label, ctx.lang) : String(v);
    }
    case "multiselect":
      return Array.isArray(v) ? v.map((x) => pick(f.options?.find((o) => o.value === x)?.label ?? { en: String(x), hi: null }, ctx.lang)).join(", ") : null;
    case "file":
      return Array.isArray(v) ? ctx.files(v.length) : null;
    default:
      return String(v);
  }
}

export interface ReviewItem {
  path: string;
  label: string;
  value: string | null;
  personal: boolean;
}

export interface ReviewRow {
  kind: "item" | "group";
  item?: ReviewItem;
  /** Repeater rows: one group per row. */
  title?: string;
  items?: ReviewItem[];
}

export interface ReviewSection {
  index: number;
  title: string;
  personal: boolean;
  rows: ReviewRow[];
}

/** Everything visible, section by section, for the review step. Blank optional answers show as null ("—"). */
export function reviewSummary(def: FormDefinition, answers: AnswerMap, ctx: DisplayCtx, rowLabel: (n: number) => string): ReviewSection[] {
  const scope = scopeOf(def, answers);
  return def.sections.map((s, index) => {
    const rows: ReviewRow[] = [];
    for (const f of s.fields) {
      if (!isValueField(f) || !isVisible(f, scope)) continue;
      if (f.kind === "repeater") {
        const list = Array.isArray(answers[f.id]) ? (answers[f.id] as AnswerMap[]) : [];
        list.forEach((row, i) => {
          if (rowBlank(f.fields ?? [], row)) return;
          const rs = rowScope(scope, f, row);
          rows.push({
            kind: "group",
            title: `${rowLabel(i + 1)}`,
            items: (f.fields ?? [])
              .filter((c) => isValueField(c) && isVisible(c, rs))
              .map((c) => ({ path: `${f.id}.${i}.${c.id}`, label: pick(c.label, ctx.lang), value: displayValue(c, row[c.id], ctx), personal: true })),
          });
        });
        if (!list.length) rows.push({ kind: "item", item: { path: f.id, label: pick(f.label, ctx.lang), value: null, personal: true } });
        continue;
      }
      rows.push({ kind: "item", item: { path: f.id, label: pick(f.label, ctx.lang), value: displayValue(f, answers[f.id], ctx), personal: s.personalData || f.personal } });
    }
    return { index, title: pick(s.title, ctx.lang), personal: s.personalData, rows };
  });
}

/** One-line summary of a finished section ("115 screened · 49 men · 66 women"). */
export function sectionSummary(def: FormDefinition, sectionIndex: number, answers: AnswerMap, ctx: DisplayCtx, limit = 4): string {
  const s = def.sections[sectionIndex];
  if (!s) return "";
  const scope = scopeOf(def, answers);
  const parts: string[] = [];
  for (const f of s.fields) {
    if (!isValueField(f) || !isVisible(f, scope) || f.kind === "repeater") continue;
    const v = displayValue(f, answers[f.id], ctx);
    if (v === null) continue;
    parts.push(f.kind === "number" ? `${v} ${pick(f.label, ctx.lang).toLocaleLowerCase(ctx.lang === "hi" ? "hi-IN" : "en-IN")}` : v);
    if (parts.length >= limit) break;
  }
  return parts.join(" · ");
}

/** Filled (non-blank) rows of a repeater. */
export function filledRows(f: FormField, answers: AnswerMap): number {
  const v = answers[f.id];
  return Array.isArray(v) ? (v as AnswerMap[]).filter((r) => r && !rowBlank(f.fields ?? [], r)).length : 0;
}

export interface KeyNumber {
  id: string;
  label: string;
  value: number;
}

/** Headline numbers for the done page: required KPI totals (no dimension) that were answered. */
export function keyNumbers(def: FormDefinition, answers: AnswerMap, lang: Lang, limit = 5): KeyNumber[] {
  const required: KeyNumber[] = [];
  const optional: KeyNumber[] = [];
  for (const s of def.sections) {
    if (s.personalData) continue;
    for (const f of s.fields) {
      if (f.kind !== "number" || !f.kpi || f.personal || parseKpiRef(f.kpi).dim) continue;
      const v = answers[f.id];
      if (typeof v !== "number") continue;
      (f.required ? required : optional).push({ id: f.id, label: pick(f.label, lang), value: v });
    }
  }
  // Required totals first (definition order), then optional ones to fill up.
  return [...required, ...optional].slice(0, limit);
}

/** Number of steps (sections + a review step when there is more than one section). */
export const stepCount = (def: FormDefinition) => def.sections.length + (def.sections.length > 1 ? 1 : 0);
export const hasReviewStep = (def: FormDefinition) => def.sections.length > 1;
