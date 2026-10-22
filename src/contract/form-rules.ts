// Form validation engine shared by the /f/ client (live checks) and the server
// (authoritative re-validation against the link's locked form version).
// Pure TypeScript, no server imports.
import type { CrossRule, FormDefinition, FormField, Rule } from "./forms";
import { parseKpiRef } from "./forms";
import type { I18nText, Locale } from "./primitives";

export type AnswerMap = Record<string, unknown>;

export type FormIssueCode =
  | "required"
  | "type"
  | "min"
  | "max"
  | "option"
  | "format"
  | "consent"
  | "cross"
  | "warn_above";

export interface FormIssue {
  /** Field id, or `repeaterId.rowIndex.childId` inside repeaters. */
  path: string;
  code: FormIssueCode;
  message: I18nText;
}

export interface FormValidation {
  ok: boolean;
  /** Block sending (red). */
  errors: FormIssue[];
  /** Never block (yellow). */
  warnings: FormIssue[];
  /** Visible, non-blank, type-coerced answers; unknown and hidden fields dropped. */
  clean: AnswerMap;
}

const msg = (en: string, hi: string): I18nText => ({ en, hi });

export const FORM_MESSAGES = {
  required: () => msg("This is required.", "यह आवश्यक है।"),
  number: () => msg("Enter a whole number.", "पूरी संख्या लिखें।"),
  text: () => msg("Enter text here.", "यहाँ लिखें।"),
  date: () => msg("Enter a valid date.", "मान्य तारीख़ लिखें।"),
  time: () => msg("Enter a valid time.", "मान्य समय लिखें।"),
  option: () => msg("Choose one of the options.", "दिए गए विकल्पों में से चुनें।"),
  yesno: () => msg("Choose yes or no.", "हाँ या नहीं चुनें।"),
  file: () => msg("Attach the file again.", "फ़ाइल दोबारा जोड़ें।"),
  rows: () => msg("Check the rows in this list.", "इस सूची की पंक्तियाँ जाँचें।"),
  minNumber: (n: number) => msg(`Must be at least ${n}.`, `कम से कम ${n} होना चाहिए।`),
  maxNumber: (n: number) => msg(`Must be at most ${n}.`, `अधिकतम ${n} हो सकता है।`),
  minLength: (n: number) => msg(`Write at least ${n} characters.`, `कम से कम ${n} अक्षर लिखें।`),
  maxLength: (n: number) => msg(`Keep this to ${n} characters or fewer.`, `इसे ${n} अक्षरों या उससे कम में रखें।`),
  minItems: (n: number) => msg(`Add at least ${n}.`, `कम से कम ${n} जोड़ें।`),
  maxItems: (n: number) => msg(`Add no more than ${n}.`, `${n} से अधिक न जोड़ें।`),
  phone: () => msg("Enter a 10-digit mobile number.", "10 अंकों का मोबाइल नंबर लिखें।"),
  consent: () =>
    msg(
      "Record consent for this person, or remove their details.",
      "इस व्यक्ति की सहमति दर्ज करें, या उनका विवरण हटा दें।",
    ),
  warnAbove: () => msg("This number is unusually high. Please check it.", "यह संख्या असामान्य रूप से अधिक है। कृपया जाँच लें।"),
} as const;

/** Kinds that carry an answer (heading/help are layout only). */
export const isValueField = (f: FormField) => f.kind !== "heading" && f.kind !== "help";

export const isBlank = (v: unknown) =>
  v === undefined || v === null || (typeof v === "string" && v.trim() === "") || (Array.isArray(v) && v.length === 0);

const DATE_RE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const NUM_RE = /^-?\d+(\.\d+)?$/;
const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

/** Accepts Indian mobiles (with or without +91/0) and other E.164 numbers. */
export function looksLikePhone(v: string): boolean {
  const s = v.replace(/[\s().-]/g, "");
  if (/^(\+91|91|0)?[6-9]\d{9}$/.test(s)) return true;
  return /^\+[1-9]\d{7,14}$/.test(s);
}

type Coerced = { ok: true; value: unknown } | { ok: false; message: I18nText };
const BAD = (message: I18nText): Coerced => ({ ok: false, message });
const OK = (value: unknown): Coerced => ({ ok: true, value });

/** Normalises one scalar answer; blank → `null`. Repeaters are handled by the caller. */
function coerce(f: FormField, raw: unknown): Coerced {
  if (isBlank(raw)) return OK(null);
  switch (f.kind) {
    case "number": {
      const n = typeof raw === "number" ? raw : typeof raw === "string" && NUM_RE.test(raw.trim()) ? Number(raw.trim()) : Number.NaN;
      return Number.isInteger(n) ? OK(n) : BAD(FORM_MESSAGES.number());
    }
    case "text":
      return typeof raw === "string" ? OK(raw.trim()) : BAD(FORM_MESSAGES.text());
    case "date":
      return typeof raw === "string" && DATE_RE.test(raw) && !Number.isNaN(Date.parse(`${raw}T00:00:00Z`)) ? OK(raw) : BAD(FORM_MESSAGES.date());
    case "time":
      return typeof raw === "string" && TIME_RE.test(raw) ? OK(raw) : BAD(FORM_MESSAGES.time());
    case "select":
      return typeof raw === "string" && (f.options ?? []).some((o) => o.value === raw) ? OK(raw) : BAD(FORM_MESSAGES.option());
    case "multiselect": {
      const vals = Array.isArray(raw) ? raw : [raw];
      const allowed = new Set((f.options ?? []).map((o) => o.value));
      return vals.every((v) => typeof v === "string" && allowed.has(v)) ? OK([...new Set(vals as string[])]) : BAD(FORM_MESSAGES.option());
    }
    case "yesno":
      if (typeof raw === "boolean") return OK(raw);
      if (raw === "yes") return OK(true);
      if (raw === "no") return OK(false);
      return BAD(FORM_MESSAGES.yesno());
    case "file": {
      const ids = Array.isArray(raw) ? raw : [raw];
      return ids.every((v) => typeof v === "string" && ID_RE.test(v)) ? OK([...new Set(ids as string[])]) : BAD(FORM_MESSAGES.file());
    }
    default:
      return OK(null);
  }
}

interface Scope {
  /** Coerced values of the current repeater row (null at top level). */
  row: AnswerMap | null;
  rowFields: Map<string, FormField> | null;
  top: AnswerMap;
  topFields: Map<string, FormField>;
}

function lookup(id: string, s: Scope): { field: FormField | undefined; value: unknown } {
  if (s.row && s.rowFields?.has(id)) return { field: s.rowFields.get(id), value: s.row[id] };
  return { field: s.topFields.get(id), value: s.top[id] };
}

function compare(op: Rule["op"] | CrossRule["op"], a: unknown, b: unknown): boolean {
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

function visible(f: FormField, s: Scope, depth = 0): boolean {
  if (!f.showIf) return true;
  if (depth > 10) return false;
  const { field, value } = lookup(f.showIf.field, s);
  if (!field || !visible(field, s, depth + 1)) return false;
  const v = Array.isArray(value) && f.showIf.op !== "filled" ? value.length : value;
  return compare(f.showIf.op, v ?? null, f.showIf.value);
}

function operand(side: string | number, s: Scope): { value: number; blank: boolean } {
  if (typeof side === "number") return { value: side, blank: false };
  let sum = 0;
  let blank = true;
  for (const id of side.split("+").map((x) => x.trim()).filter(Boolean)) {
    const { field, value } = lookup(id, s);
    if (field && visible(field, s) && typeof value === "number") {
      sum += value;
      blank = false;
    }
  }
  return { value: sum, blank };
}

const indexFields = (fields: readonly FormField[]) => new Map(fields.map((f) => [f.id, f]));

/** Every field of the definition at top level (sections flattened). */
export const topLevelFields = (def: FormDefinition): FormField[] => def.sections.flatMap((s) => s.fields);

class Run {
  errors: FormIssue[] = [];
  warnings: FormIssue[] = [];
  /** Paths that already have a type error: skip range/rule checks for them. */
  private broken = new Set<string>();

  constructor(private readonly def: FormDefinition) {}

  validate(answers: AnswerMap): FormValidation {
    const topList = topLevelFields(this.def);
    const topFields = indexFields(topList);
    const top = this.coerceAll(topList, answers, "");
    const scope: Scope = { row: null, rowFields: null, top, topFields };
    const clean: AnswerMap = {};

    for (const section of this.def.sections) {
      for (const f of section.fields) {
        if (!isValueField(f) || !visible(f, scope)) continue;
        const v = top[f.id];
        if (f.kind === "repeater") {
          const rows = this.repeater(f, v as AnswerMap[] | null, scope);
          if (rows.length) clean[f.id] = rows;
          this.checkField(f, rows.length ? rows : null, f.id, scope);
        } else {
          this.checkField(f, v, f.id, scope);
          if (!isBlank(v)) clean[f.id] = v;
        }
      }
      if (section.personalData) this.checkConsent(section.fields, scope, "");
    }
    return { ok: this.errors.length === 0, errors: this.errors, warnings: this.warnings, clean };
  }

  private coerceAll(fields: readonly FormField[], answers: AnswerMap, prefix: string): AnswerMap {
    const out: AnswerMap = {};
    for (const f of fields) {
      if (!isValueField(f)) continue;
      const raw = answers[f.id];
      if (f.kind === "repeater") {
        if (isBlank(raw)) out[f.id] = null;
        else if (!Array.isArray(raw) || raw.some((r) => typeof r !== "object" || r === null || Array.isArray(r))) {
          this.fail(prefix + f.id, "type", FORM_MESSAGES.rows());
          out[f.id] = null;
        } else {
          out[f.id] = raw.map((r: AnswerMap, i) => this.coerceAll(f.fields ?? [], r, `${prefix}${f.id}.${i}.`));
        }
        continue;
      }
      const c = coerce(f, raw);
      if (c.ok) out[f.id] = c.value;
      else {
        this.fail(prefix + f.id, "type", c.message);
        out[f.id] = null;
      }
    }
    return out;
  }

  private repeater(f: FormField, rows: AnswerMap[] | null, outer: Scope): AnswerMap[] {
    const children = f.fields ?? [];
    const rowFields = indexFields(children);
    const out: AnswerMap[] = [];
    (rows ?? []).forEach((row) => {
      // Fully blank rows are dropped (an "Add person" tapped by mistake).
      if (children.every((c) => isBlank(row[c.id]))) return;
      const i = out.length;
      const scope: Scope = { ...outer, row, rowFields };
      const cleanRow: AnswerMap = {};
      for (const c of children) {
        if (!isValueField(c) || !visible(c, scope)) continue;
        this.checkField(c, row[c.id], `${f.id}.${i}.${c.id}`, scope);
        if (!isBlank(row[c.id])) cleanRow[c.id] = row[c.id];
      }
      this.checkConsent(children, scope, `${f.id}.${i}.`);
      out.push(cleanRow);
    });
    return out;
  }

  private checkField(f: FormField, v: unknown, path: string, scope: Scope) {
    if (this.broken.has(path)) return;
    if (isBlank(v)) {
      if (f.required) this.fail(path, "required", FORM_MESSAGES.required());
      return;
    }
    const range = (n: number) => {
      if (f.min !== null && n < f.min) this.fail(path, "min", this.minMsg(f, f.min));
      else if (f.max !== null && n > f.max) this.fail(path, "max", this.maxMsg(f, f.max));
    };
    if (typeof v === "number") range(v);
    else if (typeof v === "string" && f.kind === "text") range(v.length);
    else if (Array.isArray(v)) range(v.length);

    if (f.format === "phone" && typeof v === "string" && !looksLikePhone(v)) this.fail(path, "format", FORM_MESSAGES.phone());
    if (f.warnAbove !== undefined && typeof v === "number" && v > f.warnAbove) {
      this.warnings.push({ path, code: "warn_above", message: FORM_MESSAGES.warnAbove() });
    }
    for (const rule of f.checks ?? []) {
      const left = operand(rule.left, scope);
      const right = operand(rule.right, scope);
      if (left.blank && right.blank) continue;
      if (compare(rule.op, left.value, right.value)) continue;
      const issue: FormIssue = { path, code: "cross", message: rule.message };
      if (rule.level === "error") this.errors.push(issue);
      else this.warnings.push(issue);
    }
  }

  /** Personal fields with a value need the scope's consent field set to yes. */
  private checkConsent(fields: readonly FormField[], scope: Scope, prefix: string) {
    const values = scope.row ?? scope.top;
    const consent = fields.find((f) => f.consent);
    const hasPersonal = fields.some((f) => f.personal && !f.consent && f.kind !== "repeater" && !isBlank(values[f.id]));
    if (!consent || !hasPersonal) return;
    if (values[consent.id] !== true) this.fail(prefix + consent.id, "consent", FORM_MESSAGES.consent());
  }

  private minMsg(f: FormField, n: number) {
    if (f.kind === "number") return FORM_MESSAGES.minNumber(n);
    return f.kind === "text" ? FORM_MESSAGES.minLength(n) : FORM_MESSAGES.minItems(n);
  }

  private maxMsg(f: FormField, n: number) {
    if (f.kind === "number") return FORM_MESSAGES.maxNumber(n);
    return f.kind === "text" ? FORM_MESSAGES.maxLength(n) : FORM_MESSAGES.maxItems(n);
  }

  private fail(path: string, code: FormIssueCode, message: I18nText) {
    if (this.broken.has(path)) return;
    this.broken.add(path);
    this.errors.push({ path, code, message });
  }
}

/** Validates answers against a definition. Run it on every change client-side; the server runs it again. */
export function validateAnswers(def: FormDefinition, answers: AnswerMap): FormValidation {
  return new Run(def).validate(answers);
}

/** `fields` map for a 422 (first issue per path) in one locale. */
export function issuesToFieldMap(issues: readonly FormIssue[], locale: Locale): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of issues) if (!(i.path in out)) out[i.path] = (locale === "hi" ? i.message.hi : null) ?? i.message.en;
  return out;
}

/** Whether a field sits in a personal-data section or is itself personal. */
export function personalFieldIds(def: FormDefinition): Set<string> {
  const ids = new Set<string>();
  for (const s of def.sections) for (const f of s.fields) if (s.personalData || f.personal) ids.add(f.id);
  return ids;
}

/** Splits clean answers into dashboard-safe answers and personal data. */
export function splitPersonal(def: FormDefinition, clean: AnswerMap): { answers: AnswerMap; personal: AnswerMap } {
  const personalIds = personalFieldIds(def);
  const answers: AnswerMap = {};
  const personal: AnswerMap = {};
  for (const [k, v] of Object.entries(clean)) (personalIds.has(k) ? personal : answers)[k] = v;
  return { answers, personal };
}

export interface KpiFact {
  key: string;
  /** '' = total. */
  dim: string;
  value: number;
}

/** KPI facts from clean answers: numeric, non-personal, top-level fields with a `kpi` mapping. */
export function kpiFactsFromAnswers(def: FormDefinition, clean: AnswerMap): KpiFact[] {
  const out: KpiFact[] = [];
  for (const s of def.sections) {
    if (s.personalData) continue;
    for (const f of s.fields) {
      const v = clean[f.id];
      if (!f.kpi || f.personal || f.kind !== "number" || typeof v !== "number") continue;
      out.push({ ...parseKpiRef(f.kpi), value: v });
    }
  }
  return out;
}

/** Structural problems in a definition (duplicate ids, dangling references, personal KPIs). Empty = fine. */
export function lintDefinition(def: FormDefinition): string[] {
  const problems: string[] = [];
  const top = topLevelFields(def);
  const ids = new Set<string>();
  const check = (fields: readonly FormField[], scopeIds: Set<string>, where: string) => {
    for (const f of fields) {
      if (f.kpi && (f.personal || f.kind !== "number")) problems.push(`${where}${f.id}: kpi only on non-personal number fields`);
      if (f.showIf && !scopeIds.has(f.showIf.field) && !ids.has(f.showIf.field)) problems.push(`${where}${f.id}: showIf → unknown ${f.showIf.field}`);
      for (const c of f.checks ?? []) {
        for (const side of [c.left, c.right]) {
          if (typeof side === "number") continue;
          for (const id of side.split("+")) if (!scopeIds.has(id.trim()) && !ids.has(id.trim())) problems.push(`${where}${f.id}: check → unknown ${id}`);
        }
      }
      if (f.kind === "repeater") {
        const kids = new Set((f.fields ?? []).map((k) => k.id));
        check(f.fields ?? [], kids, `${f.id}.`);
      }
    }
  };
  for (const f of top) {
    if (ids.has(f.id)) problems.push(`duplicate field id ${f.id}`);
    ids.add(f.id);
  }
  check(top, ids, "");
  for (const s of def.sections) {
    const personal = s.fields.some((f) => f.personal || f.kind === "repeater" && (f.fields ?? []).some((k) => k.personal));
    if ((s.personalData || personal) && !s.fields.some((f) => f.consent || (f.fields ?? []).some((k) => k.consent))) {
      problems.push(`section ${s.id}: personal data without a consent field`);
    }
  }
  return problems;
}
