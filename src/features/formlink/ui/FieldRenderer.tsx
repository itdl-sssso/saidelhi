"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ATTACHMENT_LIMITS, type AnswerMap, type FormDefinition, type FormField, type FormSection } from "@/contract";
import { DateField } from "@/ui/DateField";
import { FieldMessage } from "@/ui/FieldMessage";
import { ReadOnlyValue, TextAreaField, TextField, type FieldNote } from "@/ui/FormField";
import { Alert } from "@/ui/Alert";
import { FileUpload, type UploadItem } from "@/ui/FileUpload";
import { MultiSelect } from "@/ui/MultiSelect";
import { NumberField } from "@/ui/NumberField";
import { PhoneField } from "@/ui/PhoneField";
import { Repeater } from "@/ui/Repeater";
import { Select } from "@/ui/Select";
import { TimeField } from "@/ui/TimeField";
import { YesNo } from "@/ui/YesNo";
import { Icon } from "@/ui/Icon";
import { formatIsoDate, type AppLocale } from "@/lib/format";
import {
  type FieldIssues,
  type Lang,
  type Scope,
  getAnswer,
  isVisible,
  pick,
  rowScope,
  sumChecks,
  sumState,
} from "../model";
import styles from "./formlink.module.css";

export const fieldDomId = (path: string) => `f-${path.replaceAll(".", "-")}`;

export interface FileHandlers {
  items: (fieldId: string) => UploadItem[];
  add: (fieldId: string, files: File[], max: number | null) => void;
  reject: (fieldId: string, file: File, problem: "type" | "size" | "empty") => void;
  remove: (fieldId: string, key: string) => void;
  retry: (fieldId: string, key: string) => void;
}

export interface RenderCtx {
  def: FormDefinition;
  lang: Lang;
  answers: AnswerMap;
  scope: Scope;
  issues: Map<string, FieldIssues>;
  serverErrors: Record<string, string>;
  /** Whether red errors of this path show yet (field left, or Next/Send was pressed). */
  showErrors: (path: string) => boolean;
  touch: (path: string) => void;
  set: (path: string, value: unknown) => void;
  files: FileHandlers;
  fileNotes: Record<string, string>;
  disabled: boolean;
  locale: AppLocale;
  /** Inside a personal-data section: the section is marked, so single fields are not. */
  inPersonal?: boolean;
}

function notesFor(ctx: RenderCtx, path: string, key = path): FieldNote[] {
  const out: FieldNote[] = [];
  const is = ctx.issues.get(key);
  const server = ctx.serverErrors[path];
  if (ctx.showErrors(path)) {
    is?.errors.forEach((m) => out.push({ type: "error", text: pick(m, ctx.lang) }));
    if (server) out.push({ type: "error", text: server });
  }
  is?.warnings.forEach((m) => out.push({ type: "warning", text: pick(m, ctx.lang) }));
  return out;
}

function PersonalBadge() {
  const t = useTranslations("formlink");
  return (
    <span className={styles.personalBadge}>
      <Icon name="shield-check" size={16} />
      {t("personalBadge")}
    </span>
  );
}

/** One field of a definition, by kind. `path` is `id` or `repeater.row.child`. */
export function FieldView({ f, path, ctx, scope }: { f: FormField; path: string; ctx: RenderCtx; scope: Scope }) {
  const t = useTranslations("formlink");
  if (!isVisible(f, scope)) return null;
  const id = fieldDomId(path);
  const label = pick(f.label, ctx.lang);
  const help = f.help ? pick(f.help, ctx.lang) : undefined;
  const value = getAnswer(ctx.answers, path);
  const messages = notesFor(ctx, path);
  const optional = !f.required;
  const badge = f.personal && !ctx.inPersonal ? <PersonalBadge /> : undefined;
  const common = { id, label, help, optional, badge, messages: messages.length ? messages : undefined };
  const disabled = ctx.disabled;
  const onBlur = () => ctx.touch(path);

  switch (f.kind) {
    case "heading":
      return (
        <h3 className={styles.subhead} id={id}>
          {label}
        </h3>
      );
    case "help":
      return (
        <Alert tone={f.personal ? "attention" : "note"} title={label}>
          {help}
        </Alert>
      );
    case "number":
      return (
        <NumberField
          {...common}
          value={typeof value === "number" ? value : null}
          onChange={(v) => ctx.set(path, v)}
          onBlur={onBlur}
          min={f.min}
          max={f.max}
          stepper={f.max !== null && f.max <= 60}
          name={label}
          disabled={disabled}
        />
      );
    case "text": {
      if (f.readOnly && f.prefill) return <ReadOnlyValue id={id} label={label} help={help} icon={f.prefill === "samithi" ? "map-pin" : undefined} value={typeof value === "string" ? value : ""} />;
      const text = typeof value === "string" ? value : "";
      if (f.format === "phone") return <PhoneField {...common} value={text} onChange={(v) => ctx.set(path, v)} disabled={disabled} />;
      if ((f.max ?? 0) > 300) return <TextAreaField {...common} value={text} onChange={(v) => ctx.set(path, v)} onBlur={onBlur} maxLength={f.max ?? undefined} disabled={disabled} />;
      return <TextField {...common} value={text} onChange={(v) => ctx.set(path, v)} onBlur={onBlur} maxLength={f.max ?? undefined} disabled={disabled} />;
    }
    case "date":
      if (f.readOnly && f.prefill) return <ReadOnlyValue id={id} label={label} help={help} icon="calendar-days" value={typeof value === "string" ? formatIsoDate(value, ctx.locale) : ""} />;
      return <DateField {...common} value={typeof value === "string" ? value : ""} onChange={(v) => ctx.set(path, v)} disabled={disabled} />;
    case "time":
      return <TimeField {...common} value={typeof value === "string" ? value : ""} onChange={(v) => ctx.set(path, v)} disabled={disabled} />;
    case "select": {
      const options = (f.options ?? []).map((o) => ({ value: o.value, label: pick(o.label, ctx.lang) }));
      // Few options read faster as chips; long lists use the phone's own picker.
      if (options.length <= 4) {
        return (
          <MultiSelect
            {...common}
            single
            options={options}
            value={typeof value === "string" && value ? [value] : []}
            onChange={(v) => ctx.set(path, v[0] ?? null)}
            disabled={disabled}
          />
        );
      }
      return (
        <div data-field={id}>
          <Select
            id={id}
            label={label}
            hint={help}
            optional={optional}
            error={messages.find((m) => m.type === "error")?.text}
            placeholder={t("chooseOption")}
            options={options}
            value={typeof value === "string" ? value : ""}
            onChange={(e) => ctx.set(path, e.target.value || null)}
            onBlur={onBlur}
            disabled={disabled}
          />
        </div>
      );
    }
    case "multiselect":
      return (
        <MultiSelect
          {...common}
          options={(f.options ?? []).map((o) => ({ value: o.value, label: pick(o.label, ctx.lang) }))}
          value={Array.isArray(value) ? (value as string[]) : []}
          onChange={(v) => ctx.set(path, v)}
          disabled={disabled}
        />
      );
    case "yesno":
      return <YesNo {...common} value={typeof value === "boolean" ? value : null} onChange={(v) => ctx.set(path, v)} disabled={disabled} />;
    case "file": {
      const note = ctx.fileNotes[f.id];
      const msgs = [...(common.messages ?? []), ...(note ? [{ type: "error" as const, text: note }] : [])];
      return (
        <FileUpload
          id={id}
          label={label}
          help={help}
          optional={optional}
          messages={msgs.length ? msgs : undefined}
          items={ctx.files.items(f.id)}
          limits={ATTACHMENT_LIMITS}
          maxFiles={f.max}
          disabled={disabled}
          onAdd={(files) => ctx.files.add(f.id, files, f.max)}
          onReject={(file, problem) => ctx.files.reject(f.id, file, problem)}
          onRemove={(key) => ctx.files.remove(f.id, key)}
          onRetry={(key) => ctx.files.retry(f.id, key)}
        />
      );
    }
    case "repeater": {
      const rows = Array.isArray(ctx.answers[f.id]) ? (ctx.answers[f.id] as AnswerMap[]) : [];
      return (
        <Repeater<AnswerMap>
          id={id}
          label={label}
          help={help}
          optional={optional}
          badge={badge}
          messages={messages.length ? messages : undefined}
          rows={rows}
          rowKey={(_, i) => String(i)}
          max={f.max}
          disabled={disabled}
          itemLabel={t("person")}
          addLabel={t("addPerson")}
          empty={t("noPeople")}
          onAdd={() => ctx.set(f.id, [...rows, {}])}
          onRemove={(i) => ctx.set(f.id, rows.filter((_, j) => j !== i))}
          renderRow={(row, i) => {
            const rs = rowScope(scope, f, row);
            return (
              <>
                {(f.fields ?? []).map((c) => (
                  <FieldView key={c.id} f={c} path={`${f.id}.${i}.${c.id}`} ctx={ctx} scope={rs} />
                ))}
              </>
            );
          }}
        />
      );
    }
  }
}

/** The live "adds up to" line for a sum rule (powers add to total). */
export function SumLine({ check, ctx }: { check: ReturnType<typeof sumChecks>[number]; ctx: RenderCtx }) {
  const t = useTranslations("formlink");
  const st = sumState(check, ctx.scope);
  const issues = ctx.issues.get(`sum:${check.owner}`);
  const total = st.total ?? 0;
  if (st.total === null) return null;
  if (st.matches) return <FieldMessage type="check">{t("sumOk", { sum: st.sum, total })}</FieldMessage>;
  const err = issues && ctx.showErrors(check.anchor) ? issues.errors[0] : null;
  if (err) {
    return (
      <div id={`sum-${check.owner}`} role="alert">
        <FieldMessage type="error">
          {t("sumSoFar", { sum: st.sum, total })} · {pick(err, ctx.lang)}
        </FieldMessage>
      </div>
    );
  }
  return <FieldMessage type="info">{st.blank ? t("sumBlank", { total }) : t("sumSoFar", { sum: st.sum, total })}</FieldMessage>;
}

/** Fields of one section with the sum lines under their anchors. */
export function SectionFields({ section, ctx }: { section: FormSection; ctx: RenderCtx }): ReactNode {
  const sums = sumChecks(section);
  return (
    <div className={styles.fields}>
      {section.fields.map((f) => (
        <div key={f.id} className={styles.stack} style={{ gap: 8 }}>
          <FieldView f={f} path={f.id} ctx={ctx} scope={ctx.scope} />
          {sums.filter((c) => c.anchor === f.id && isVisible(f, ctx.scope)).map((c) => <SumLine key={c.owner + c.rule.message.en} check={c} ctx={ctx} />)}
        </div>
      ))}
    </div>
  );
}

