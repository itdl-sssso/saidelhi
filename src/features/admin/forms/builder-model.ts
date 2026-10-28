// Pure helpers for the form builder UI (spec 31). No React: unit-tested in tests/m6-builder-ui.test.ts.
import { type CrossRule, type FormDefinition, type FormField, type FormFieldKind, type FormSection, type Rule, PALETTE_KINDS, PHOTO_LIMITS } from "@/contract";

export type Kind = (typeof PALETTE_KINDS)[number];
export const RETENTION_CHOICES = [30, 90, 365, 730] as const;
/** Field kinds allowed inside a repeater row (one level deep). */
export const CHILD_KINDS: readonly Kind[] = ["number", "text", "date", "time", "select", "yesno"];
export const RULE_OPS = ["eq", "neq", "gt", "gte", "lt", "lte", "in", "filled"] as const;
export const CROSS_OPS = ["lte", "gte", "eq", "lt", "gt"] as const;

const rand = () => Math.random().toString(36).slice(2, 6);

/** Every field with its parent repeater (null for top level) and section. */
export function flatFields(def: FormDefinition): Array<{ f: FormField; parent: FormField | null; section: FormSection }> {
  const out: Array<{ f: FormField; parent: FormField | null; section: FormSection }> = [];
  for (const section of def.sections) {
    for (const f of section.fields) {
      out.push({ f, parent: null, section });
      for (const c of f.fields ?? []) out.push({ f: c, parent: f, section });
    }
  }
  return out;
}

export const allIds = (def: FormDefinition) => new Set(flatFields(def).map((x) => x.f.id));

/** Lower-case snake id from an English label, unique against `taken`. */
export function slugId(label: string, taken: ReadonlySet<string>, fallback = "field"): string {
  const base =
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 40) || fallback;
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}_${n}`)) n++;
  return `${base}_${n}`;
}

/** Temporary ids start with `f_`; they are renamed from the English label until the field is saved in a published version. */
export const isTempId = (id: string) => /^f_[a-z0-9]{4}$/.test(id);

export function newField(kind: Kind, taken: ReadonlySet<string>): FormField {
  let id = `f_${rand()}`;
  while (taken.has(id)) id = `f_${rand()}`;
  const base: FormField = {
    id,
    kind: kind as FormFieldKind,
    label: { en: "", hi: null },
    help: null,
    required: false,
    min: null,
    max: null,
    kpi: null,
    locked: false,
    personal: false,
  };
  if (kind === "number") return { ...base, min: 0, max: 100000 };
  if (kind === "select" || kind === "multiselect") return { ...base, options: [{ value: "option_1", label: { en: "", hi: null } }] };
  if (kind === "repeater") return { ...base, fields: [] };
  if (kind === "photos") return { ...base, kind: "file", photos: true, max: PHOTO_LIMITS.defaultMax };
  if (kind === "file") return { ...base, max: 3 };
  if (kind === "yesno") return base;
  return base;
}

/** Replace a field (top level or repeater child) by id. */
export function updateField(def: FormDefinition, id: string, patch: Partial<FormField> | ((f: FormField) => FormField)): FormDefinition {
  const apply = (f: FormField): FormField => {
    if (f.id === id) return typeof patch === "function" ? patch(f) : { ...f, ...patch };
    return f.fields ? { ...f, fields: f.fields.map(apply) } : f;
  };
  return { ...def, sections: def.sections.map((s) => ({ ...s, fields: s.fields.map(apply) })) };
}

/** Rename a field id everywhere it is referenced (showIf, checks, itself). */
export function renameField(def: FormDefinition, from: string, to: string): FormDefinition {
  if (from === to) return def;
  const sub = (expr: string) => expr.split("+").map((p) => (p.trim() === from ? to : p.trim())).join("+");
  const fix = (f: FormField): FormField => ({
    ...f,
    id: f.id === from ? to : f.id,
    ...(f.showIf ? { showIf: f.showIf.field === from ? { ...f.showIf, field: to } : f.showIf } : {}),
    ...(f.checks ? { checks: f.checks.map((c) => ({ ...c, left: sub(c.left), right: typeof c.right === "string" ? sub(c.right) : c.right })) } : {}),
    ...(f.fields ? { fields: f.fields.map(fix) } : {}),
  });
  return { ...def, sections: def.sections.map((s) => ({ ...s, fields: s.fields.map(fix) })) };
}

export function addField(def: FormDefinition, sectionId: string, field: FormField, parentId?: string, index?: number): FormDefinition {
  return {
    ...def,
    sections: def.sections.map((s) => {
      if (s.id !== sectionId) return s;
      if (parentId) return { ...s, fields: s.fields.map((f) => (f.id === parentId ? { ...f, fields: [...(f.fields ?? []), field] } : f)) };
      const at = index ?? s.fields.length;
      return { ...s, fields: [...s.fields.slice(0, at), field, ...s.fields.slice(at)] };
    }),
  };
}

/** Remove a field and every reference to it (showIf cleared, check operands dropped with the check). */
export function removeField(def: FormDefinition, id: string): FormDefinition {
  const refs = (c: CrossRule) => [c.left, c.right].some((s) => typeof s === "string" && s.split("+").some((p) => p.trim() === id));
  const clean = (f: FormField): FormField => {
    const { showIf, checks, fields, ...rest } = f;
    const next: FormField = { ...rest } as FormField;
    if (showIf && showIf.field !== id) next.showIf = showIf;
    const kept = (checks ?? []).filter((c) => !refs(c));
    if (kept.length) next.checks = kept;
    if (fields) next.fields = fields.filter((c) => c.id !== id).map(clean);
    return next;
  };
  return { ...def, sections: def.sections.map((s) => ({ ...s, fields: s.fields.filter((f) => f.id !== id).map(clean) })) };
}

export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return [...list];
  const copy = [...list];
  const [x] = copy.splice(from, 1);
  copy.splice(to, 0, x);
  return copy;
}

export function reorderFields(def: FormDefinition, sectionId: string, from: number, to: number, parentId?: string): FormDefinition {
  return {
    ...def,
    sections: def.sections.map((s) => {
      if (s.id !== sectionId) return s;
      if (parentId) return { ...s, fields: s.fields.map((f) => (f.id === parentId ? { ...f, fields: moveItem(f.fields ?? [], from, to) } : f)) };
      return { ...s, fields: moveItem(s.fields, from, to) };
    }),
  };
}

export function newSection(def: FormDefinition): FormSection {
  const taken = new Set(def.sections.map((s) => s.id));
  let id = `s_${rand()}`;
  while (taken.has(id)) id = `s_${rand()}`;
  return { id, title: { en: "", hi: null }, fields: [], personalData: false };
}

/** Consent field a personal section needs (yes/no that records the person agreed). */
export function consentField(taken: ReadonlySet<string>): FormField {
  const f = newField("yesno", taken);
  return {
    ...f,
    id: slugId("consent", taken),
    label: { en: "This person agreed to share this", hi: "इस व्यक्ति ने इसे साझा करने की सहमति दी है" },
    required: true,
    consent: true,
  };
}

/** Marks a field personal. A top-level personal field needs a consent field in its section. */
export function setPersonal(def: FormDefinition, id: string, personal: boolean): FormDefinition {
  let next = updateField(def, id, (f) => ({ ...f, personal, kpi: personal ? null : f.kpi, retentionDays: personal ? (f.retentionDays ?? 365) : undefined }));
  if (!personal) return next;
  const hit = flatFields(next).find((x) => x.f.id === id);
  if (!hit) return next;
  const scope = hit.parent ? (hit.parent.fields ?? []) : hit.section.fields;
  if (scope.some((x) => x.consent)) return next;
  const c = consentField(allIds(next));
  next = hit.parent ? addField(next, hit.section.id, c, hit.parent.id) : addField(next, hit.section.id, c);
  return next;
}

// ---- Rule labels -------------------------------------------------------------

export const OP_SYMBOL: Record<(typeof RULE_OPS)[number], string> = { eq: "=", neq: "≠", gt: ">", gte: "≥", lt: "<", lte: "≤", in: "in", filled: "is filled" };
export const CROSS_SYMBOL: Record<(typeof CROSS_OPS)[number], string> = { lte: "≤", gte: "≥", eq: "=", lt: "<", gt: ">" };

type LabelOf = (id: string) => string;

/** "Show when Spectacles given > 0". */
export function ruleText(rule: Rule, labelOf: LabelOf): { field: string; op: string; value: string } {
  const value = rule.op === "filled" ? "" : Array.isArray(rule.value) ? rule.value.join(", ") : rule.value === undefined || rule.value === null ? "" : typeof rule.value === "boolean" ? (rule.value ? "yes" : "no") : String(rule.value);
  return { field: labelOf(rule.field), op: OP_SYMBOL[rule.op], value };
}

export const operandText = (expr: string | number, labelOf: LabelOf) => (typeof expr === "number" ? String(expr) : expr.split("+").map((p) => labelOf(p.trim())).join(" + "));

/** "Cataract found must be ≤ People screened". */
export const checkText = (c: CrossRule, labelOf: LabelOf) => `${operandText(c.left, labelOf)} ${CROSS_SYMBOL[c.op]} ${operandText(c.right, labelOf)}`;

/** Parse the value box of a show-if rule for the target field's kind. */
export function parseRuleValue(kind: FormFieldKind, op: Rule["op"], raw: string): unknown {
  if (op === "filled") return undefined;
  if (op === "in") return raw.split(",").map((s) => s.trim()).filter(Boolean);
  if (kind === "number") return raw.trim() === "" ? undefined : Number(raw);
  if (kind === "yesno") return raw === "yes";
  return raw;
}

/** Ops that make sense for a field kind. */
export function opsFor(kind: FormFieldKind): Array<(typeof RULE_OPS)[number]> {
  if (kind === "number") return ["gt", "gte", "lt", "lte", "eq", "neq", "filled"];
  if (kind === "yesno") return ["eq", "filled"];
  if (kind === "select" || kind === "multiselect") return ["eq", "neq", "in", "filled"];
  return ["eq", "neq", "filled"];
}

/** Fields a show-if rule or check operand may point at. */
export function ruleTargets(def: FormDefinition, selfId: string) {
  return flatFields(def).filter(({ f, parent }) => !parent && f.id !== selfId && !["heading", "help", "file", "repeater"].includes(f.kind) && !f.personal);
}

export function numericTargets(def: FormDefinition, selfId: string) {
  const self = flatFields(def).find((x) => x.f.id === selfId);
  const siblings = self?.parent ? (self.parent.fields ?? []) : [];
  const top = flatFields(def).filter(({ f, parent }) => !parent && f.kind === "number" && !f.personal).map((x) => x.f);
  const seen = new Set<string>();
  return [...siblings.filter((f) => f.kind === "number"), ...top].filter((f) => (seen.has(f.id) ? false : (seen.add(f.id), true)));
}
