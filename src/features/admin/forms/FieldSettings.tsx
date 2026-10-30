"use client";

import { useLocale, useTranslations } from "next-intl";
import {
  type CrossRule,
  type FormDefinition,
  type FormField,
  type FormSection,
  type KpiOption,
  type Rule,
  ID_NUMBER_PATTERN,
} from "@/contract";
import { type AppLocale, tx } from "@/lib/format";
import { Button } from "@/ui/Button";
import { Icon } from "@/ui/Icon";
import { Input } from "@/ui/Input";
import { Select } from "@/ui/Select";
import { Switch } from "@/ui/Switch";
import { Trash2 } from "../icons";
import {
  CROSS_OPS,
  CROSS_SYMBOL,
  OP_SYMBOL,
  RETENTION_CHOICES,
  allIds,
  consentField,
  addField,
  flatFields,
  isTempId,
  numericTargets,
  opsFor,
  parseRuleValue,
  renameField,
  ruleTargets,
  setPersonal,
  slugId,
  updateField,
} from "./builder-model";
import s from "./Builder.module.css";

const hiOrNull = (v: string) => v || null;

interface Props {
  def: FormDefinition;
  field: FormField;
  kpiOptions: KpiOption[];
  /** Ids already in a published version: renaming them would break links and Excel headers. */
  publishedIds: ReadonlySet<string>;
  onChange: (def: FormDefinition) => void;
  onRemove: (f: FormField) => void;
  onIdChange: (id: string) => void;
  readOnly: boolean;
}

export function FieldSettings({ def, field: f, kpiOptions, publishedIds, onChange, onRemove, onIdChange, readOnly }: Props) {
  const t = useTranslations("admin.builder");
  const locale = useLocale() as AppLocale;
  const hit = flatFields(def).find((x) => x.f.id === f.id);
  const isChild = !!hit?.parent;
  const patch = (p: Partial<FormField>) => onChange(updateField(def, f.id, p));
  const labelOf = (id: string) => {
    const x = flatFields(def).find((y) => y.f.id === id)?.f;
    return (x && ((locale === "hi" && x.label.hi) || x.label.en)) || id;
  };
  const isValue = f.kind !== "heading" && f.kind !== "help";
  const idLike = ID_NUMBER_PATTERN.test(`${f.id} ${f.label.en}`);

  const setLabelEn = (en: string) => {
    let next = updateField(def, f.id, { label: { ...f.label, en } });
    if (isTempId(f.id) && !publishedIds.has(f.id) && en.trim()) {
      const to = slugId(en, new Set([...allIds(def)].filter((x) => x !== f.id)));
      next = renameField(next, f.id, to);
      onIdChange(to);
    }
    onChange(next);
  };

  const options = f.options ?? [];
  const setOption = (i: number, o: { value?: string; en?: string; hi?: string }) =>
    patch({ options: options.map((x, j) => (j === i ? { value: o.value ?? x.value, label: { en: o.en ?? x.label.en, hi: o.hi !== undefined ? hiOrNull(o.hi) : x.label.hi } } : x)) });

  const targets = ruleTargets(def, f.id);
  const target = targets.find((x) => x.f.id === f.showIf?.field)?.f;

  const nums = numericTargets(def, f.id);
  const checks = f.checks ?? [];
  const setCheck = (i: number, c: Partial<CrossRule>) => patch({ checks: checks.map((x, j) => (j === i ? { ...x, ...c } : x)) });

  return (
    <div className={s.setBd}>
      {readOnly ? <p className={s.mono}>{t("readOnly")}</p> : null}
      <div className={s.mono}>
        {t("fieldId")}: {f.id}
        {f.locked ? ` · ${t("lockedNote")}` : ""}
      </div>

      <fieldset disabled={readOnly} style={{ border: 0, padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
        <div className={s.row2}>
          <Input label={t("labelEn")} value={f.label.en} onChange={(e) => setLabelEn(e.target.value)} error={idLike ? t("noIdNumbers") : undefined} />
          <Input label={t("labelHi")} lang="hi" value={f.label.hi ?? ""} onChange={(e) => patch({ label: { ...f.label, hi: hiOrNull(e.target.value) } })} />
        </div>
        {f.kind !== "heading" ? (
          <div className={s.row2}>
            <Input label={t("helpEn")} optional value={f.help?.en ?? ""} onChange={(e) => patch({ help: e.target.value || f.help?.hi ? { en: e.target.value, hi: f.help?.hi ?? null } : null })} />
            <Input label={t("helpHi")} optional lang="hi" value={f.help?.hi ?? ""} onChange={(e) => patch({ help: f.help?.en || e.target.value ? { en: f.help?.en ?? "", hi: hiOrNull(e.target.value) } : null })} />
          </div>
        ) : null}

        {isValue && f.kind !== "repeater" ? <Switch label={t("requiredSwitch")} checked={f.required} disabled={f.locked && f.required} onChange={(e) => patch({ required: e.target.checked })} /> : null}

        {f.kind === "number" ? (
          <div className={s.row2}>
            <Input label={t("min")} type="number" value={f.min ?? ""} onChange={(e) => patch({ min: e.target.value === "" ? null : Number(e.target.value) })} />
            <Input label={t("max")} type="number" value={f.max ?? ""} onChange={(e) => patch({ max: e.target.value === "" ? null : Number(e.target.value) })} />
          </div>
        ) : null}
        {f.kind === "text" ? (
          <div className={s.row2}>
            <Input label={t("minLen")} type="number" optional value={f.min ?? ""} onChange={(e) => patch({ min: e.target.value === "" ? null : Number(e.target.value) })} />
            <Input label={t("maxLen")} type="number" optional value={f.max ?? ""} onChange={(e) => patch({ max: e.target.value === "" ? null : Number(e.target.value) })} />
          </div>
        ) : null}
        {f.kind === "file" ? <Input label={t(f.photos ? "maxPhotos" : "maxFiles")} type="number" value={f.max ?? ""} onChange={(e) => patch({ max: e.target.value === "" ? null : Number(e.target.value) })} /> : null}

        {f.kind === "select" || f.kind === "multiselect" ? (
          <div className={s.grp}>
            <h3 className={s.grpT}>{t("options")}</h3>
            {options.map((o, i) => (
              <div key={i} className={s.optRow}>
                <Input label={i === 0 ? t("optionEn") : undefined} aria-label={t("optionEn")} value={o.label.en} onChange={(e) => setOption(i, { en: e.target.value, value: o.value.startsWith("option_") ? slugId(e.target.value, new Set(options.filter((_, j) => j !== i).map((x) => x.value)), `option_${i + 1}`) : o.value })} />
                <Input label={i === 0 ? t("optionHi") : undefined} aria-label={t("optionHi")} lang="hi" value={o.label.hi ?? ""} onChange={(e) => setOption(i, { hi: e.target.value })} />
                <button type="button" className={s.ib} aria-label={t("removeOption")} disabled={options.length <= 1} onClick={() => patch({ options: options.filter((_, j) => j !== i) })}>
                  <Icon icon={Trash2} size={18} />
                </button>
              </div>
            ))}
            <Button variant="ghost" size="sm" icon="plus" onClick={() => patch({ options: [...options, { value: `option_${options.length + 1}`, label: { en: "", hi: null } }] })}>
              {t("addOption")}
            </Button>
          </div>
        ) : null}

        {isValue && f.kind !== "repeater" && !isChild ? (
          <div className={s.grp}>
            <h3 className={s.grpT}>{t("showIf")}</h3>
            {f.showIf ? (
              <div className={s.rule}>
                <Select
                  label={t("showWhen")}
                  value={f.showIf.field}
                  onChange={(e) => {
                    const nf = targets.find((x) => x.f.id === e.target.value)?.f;
                    patch({ showIf: { field: e.target.value, op: opsFor(nf?.kind ?? "text")[0], value: nf?.kind === "yesno" ? true : undefined } });
                  }}
                  options={[...(target ? [] : [{ value: f.showIf.field, label: labelOf(f.showIf.field) }]), ...targets.map((x) => ({ value: x.f.id, label: labelOf(x.f.id) }))]}
                />
                <div className={s.row2}>
                  <Select label={t("ruleOp")} value={f.showIf.op} onChange={(e) => patch({ showIf: { ...f.showIf!, op: e.target.value as Rule["op"], value: parseRuleValue(target?.kind ?? "text", e.target.value as Rule["op"], "") } })} options={opsFor(target?.kind ?? "text").map((o) => ({ value: o, label: t(`op.${o}`) }))} />
                  {f.showIf.op === "filled" ? null : target?.kind === "yesno" ? (
                    <Select label={t("ruleValue")} value={f.showIf.value === false ? "no" : "yes"} onChange={(e) => patch({ showIf: { ...f.showIf!, value: e.target.value === "yes" } })} options={[{ value: "yes", label: t("yes") }, { value: "no", label: t("no") }]} />
                  ) : (target?.kind === "select" || target?.kind === "multiselect") && f.showIf.op !== "in" ? (
                    <Select label={t("ruleValue")} value={String(f.showIf.value ?? "")} onChange={(e) => patch({ showIf: { ...f.showIf!, value: e.target.value } })} options={[{ value: "", label: "—" }, ...(target.options ?? []).map((o) => ({ value: o.value, label: tx(o.label, locale) }))]} />
                  ) : (
                    <Input label={t("ruleValue")} type={target?.kind === "number" ? "number" : "text"} value={Array.isArray(f.showIf.value) ? f.showIf.value.join(", ") : String(f.showIf.value ?? "")} onChange={(e) => patch({ showIf: { ...f.showIf!, value: parseRuleValue(target?.kind ?? "text", f.showIf!.op, e.target.value) } })} />
                  )}
                </div>
                <p className={s.mono}>{t("showText", { field: labelOf(f.showIf.field), op: OP_SYMBOL[f.showIf.op], value: f.showIf.op === "filled" ? "" : String(f.showIf.value ?? "") })}</p>
                <Button variant="ghost" size="sm" onClick={() => patch({ showIf: undefined })}>
                  {t("removeRule")}
                </Button>
              </div>
            ) : (
              <Button variant="outline" size="sm" icon="plus" disabled={targets.length === 0} onClick={() => patch({ showIf: { field: targets[0].f.id, op: opsFor(targets[0].f.kind)[0], value: targets[0].f.kind === "yesno" ? true : undefined } })}>
                {t("addShowIf")}
              </Button>
            )}
          </div>
        ) : null}

        {f.kind === "number" && !f.personal ? (
          <div className={s.grp}>
            <h3 className={s.grpT}>{t("checks")}</h3>
            {checks.map((c, i) => (
              <CheckEditor key={i} c={c} nums={nums} labelOf={labelOf} onChange={(x) => setCheck(i, x)} onRemove={() => patch({ checks: checks.filter((_, j) => j !== i) })} />
            ))}
            <Button variant="outline" size="sm" icon="plus" disabled={nums.length < 2} onClick={() => patch({ checks: [...checks, { op: "lte", left: f.id, right: nums.find((n) => n.id !== f.id)?.id ?? 0, level: "error", message: { en: "", hi: null } }] })}>
              {t("addCheck")}
            </Button>
            <Input label={t("warnAbove")} type="number" optional hint={t("warnHint")} value={f.warnAbove ?? ""} onChange={(e) => patch({ warnAbove: e.target.value === "" ? undefined : Number(e.target.value) })} />
          </div>
        ) : null}

        {f.kind === "number" && !f.personal ? (
          <div className={s.grp}>
            <h3 className={s.grpT}>{t("kpiMap")}</h3>
            <Select
              label={t("mapsTo")}
              value={f.kpi ?? ""}
              disabled={f.locked && !!f.kpi}
              onChange={(e) => patch({ kpi: e.target.value || null })}
              options={[{ value: "", label: t("kpiCustom") }, ...(f.kpi && !kpiOptions.some((k) => k.key === f.kpi) ? [{ value: f.kpi, label: f.kpi }] : []), ...kpiOptions.map((k) => ({ value: k.key, label: `${tx(k.label, locale)} (${k.key})` }))]}
            />
          </div>
        ) : null}

        {isValue && f.kind !== "heading" && f.kind !== "help" && f.kind !== "repeater" && f.kind !== "file" && !f.locked ? (
          <div className={s.grp}>
            <h3 className={s.grpT}>{t("personalData")}</h3>
            <Switch label={t("personalSwitch")} checked={f.personal} onChange={(e) => onChange(setPersonal(def, f.id, e.target.checked))} />
            {f.personal ? (
              <>
                <span className={s.excl}>
                  <Icon name="shield-check" size={16} />
                  {t("personalExcluded")}
                </span>
                <Select label={t("retention")} value={String(f.retentionDays ?? 365)} onChange={(e) => patch({ retentionDays: Number(e.target.value) })} options={RETENTION_CHOICES.map((d) => ({ value: String(d), label: t("retentionDays", { n: d }) }))} hint={t("retentionHint")} />
              </>
            ) : null}
          </div>
        ) : null}

        {f.kind === "repeater" ? <p className={s.mono}>{t("repeaterNote")}</p> : null}
      </fieldset>

      {!f.locked && !readOnly ? (
        <Button variant="outline" icon="trash-2" onClick={() => onRemove(f)}>
          {t("removeFieldBtn")}
        </Button>
      ) : null}
    </div>
  );
}

function CheckEditor({ c, nums, labelOf, onChange, onRemove }: { c: CrossRule; nums: FormField[]; labelOf: (id: string) => string; onChange: (c: Partial<CrossRule>) => void; onRemove: () => void }) {
  const t = useTranslations("admin.builder");
  const side = (expr: string | number) => (typeof expr === "number" ? new Set<string>() : new Set(expr.split("+").map((x) => x.trim())));
  const toggle = (which: "left" | "right", id: string) => {
    const cur = side(c[which]);
    if (cur.has(id)) cur.delete(id);
    else cur.add(id);
    const next = nums.map((n) => n.id).filter((x) => cur.has(x));
    for (const x of cur) if (!next.includes(x)) next.push(x);
    onChange({ [which]: next.join("+") } as Partial<CrossRule>);
  };
  const rightIsNumber = typeof c.right === "number";
  return (
    <div className={s.rule}>
      <b className={s.grpT}>{t("checkLeft")}</b>
      <div className={s.checkRow}>
        {nums.map((n) => (
          <label key={n.id}>
            <input type="checkbox" checked={side(c.left).has(n.id)} onChange={() => toggle("left", n.id)} />
            {labelOf(n.id)}
          </label>
        ))}
      </div>
      <Select label={t("checkMust")} value={c.op} onChange={(e) => onChange({ op: e.target.value as CrossRule["op"] })} options={CROSS_OPS.map((o) => ({ value: o, label: `${CROSS_SYMBOL[o]} ${t(`cross.${o}`)}` }))} />
      <Select label={t("checkRight")} value={rightIsNumber ? "number" : "fields"} onChange={(e) => onChange({ right: e.target.value === "number" ? 0 : (nums.find((n) => n.id !== c.left)?.id ?? "") })} options={[{ value: "fields", label: t("checkFields") }, { value: "number", label: t("checkNumber") }]} />
      {rightIsNumber ? (
        <Input aria-label={t("checkNumber")} type="number" value={c.right as number} onChange={(e) => onChange({ right: Number(e.target.value) })} />
      ) : (
        <div className={s.checkRow}>
          {nums.map((n) => (
            <label key={n.id}>
              <input type="checkbox" checked={side(c.right).has(n.id)} onChange={() => toggle("right", n.id)} />
              {labelOf(n.id)}
            </label>
          ))}
        </div>
      )}
      <Select label={t("checkLevel")} value={c.level} onChange={(e) => onChange({ level: e.target.value as "error" | "warn" })} options={[{ value: "error", label: t("levelError") }, { value: "warn", label: t("levelWarn") }]} />
      <div className={s.row2}>
        <Input label={t("messageEn")} value={c.message.en} onChange={(e) => onChange({ message: { ...c.message, en: e.target.value } })} />
        <Input label={t("messageHi")} lang="hi" value={c.message.hi ?? ""} onChange={(e) => onChange({ message: { ...c.message, hi: hiOrNull(e.target.value) } })} />
      </div>
      <Button variant="ghost" size="sm" onClick={onRemove}>
        {t("removeRule")}
      </Button>
    </div>
  );
}

export function SectionSettings({ def, section, onChange, onRemove, readOnly }: { def: FormDefinition; section: FormSection; onChange: (def: FormDefinition) => void; onRemove: () => void; readOnly: boolean }) {
  const t = useTranslations("admin.builder");
  const patch = (p: Partial<FormSection>) => onChange({ ...def, sections: def.sections.map((x) => (x.id === section.id ? { ...x, ...p } : x)) });
  const locked = section.fields.some((f) => f.locked);
  const hasConsent = section.fields.some((f) => f.consent);
  return (
    <div className={s.setBd}>
      <fieldset disabled={readOnly} style={{ border: 0, padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
        <div className={s.row2}>
          <Input label={t("sectionTitleEn")} value={section.title.en} onChange={(e) => patch({ title: { ...section.title, en: e.target.value } })} />
          <Input label={t("sectionTitleHi")} lang="hi" value={section.title.hi ?? ""} onChange={(e) => patch({ title: { ...section.title, hi: hiOrNull(e.target.value) } })} />
        </div>
        <Switch
          label={t("personalSection")}
          checked={section.personalData}
          onChange={(e) => {
            const on = e.target.checked;
            let next: FormDefinition = { ...def, sections: def.sections.map((x) => (x.id === section.id ? { ...x, personalData: on } : x)) };
            if (on && !hasConsent) next = addField(next, section.id, consentField(allIds(next)));
            onChange(next);
          }}
        />
        {section.personalData ? (
          <span className={s.excl}>
            <Icon name="shield-check" size={16} />
            {t("personalExcluded")}
          </span>
        ) : null}
      </fieldset>
      {locked ? <p className={s.mono}>{t("sectionLocked")}</p> : !readOnly ? (
        <Button variant="outline" icon="trash-2" onClick={onRemove}>
          {t("removeSection")}
        </Button>
      ) : null}
    </div>
  );
}
