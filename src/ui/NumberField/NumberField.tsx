"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "../Icon";
import { FormField, fieldDescribedBy, hasError, hasWarning, type FieldNote } from "../FormField/FormField";
import fieldStyles from "../FormField/FormField.module.css";
import { cx } from "../cx";
import styles from "./NumberField.module.css";

export type NumberFieldProps = {
  id: string;
  label: ReactNode;
  value: number | null;
  onChange: (value: number | null) => void;
  help?: ReactNode;
  optional?: boolean;
  badge?: ReactNode;
  messages?: FieldNote[];
  min?: number | null;
  max?: number | null;
  /** Big −/+ buttons around the number, for counts tapped up at a desk. */
  stepper?: boolean;
  /** Short name used in "Decrease …" / "Increase …" button labels; defaults to the label when it is a string. */
  name?: string;
  suffix?: ReactNode;
  disabled?: boolean;
  onBlur?: () => void;
};

const digitsOnly = (s: string) => s.replace(/[^\d]/g, "");

/** Whole numbers with the numeric keypad. Blank stays blank (null), never 0. */
export function NumberField({
  id,
  label,
  value,
  onChange,
  help,
  optional,
  badge,
  messages,
  min = 0,
  max = null,
  stepper,
  name,
  suffix,
  disabled,
  onBlur,
}: NumberFieldProps) {
  const t = useTranslations("fieldKit");
  const lo = min ?? 0;
  const hi = max ?? Number.MAX_SAFE_INTEGER;
  // Text mirror so the field can be cleared without becoming 0.
  const [text, setText] = useState(value === null ? "" : String(value));
  const [shown, setShown] = useState(value);
  if (shown !== value) {
    setShown(value);
    setText(value === null ? "" : String(value));
  }

  const commit = (raw: string) => {
    const d = digitsOnly(raw).replace(/^0+(?=\d)/, "").slice(0, 9);
    setText(d);
    const n = d === "" ? null : Number(d);
    setShown(n);
    onChange(n);
  };
  const bump = (delta: number) => {
    const base = value ?? (delta > 0 ? lo - 1 : lo + 1);
    const n = Math.min(hi, Math.max(lo, base + delta));
    setText(String(n));
    setShown(n);
    onChange(n);
  };

  const state = hasError(messages) ? "error" : hasWarning(messages) ? "warning" : undefined;
  const who = name ?? (typeof label === "string" ? label : "");
  const input = (
    <input
      id={id}
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      autoComplete="off"
      enterKeyHint="next"
      value={text}
      disabled={disabled}
      onChange={(e) => commit(e.target.value)}
      onBlur={onBlur}
      aria-invalid={state === "error" || undefined}
      aria-describedby={fieldDescribedBy(id, { help, messages })}
    />
  );

  return (
    <FormField id={id} label={label} help={help} optional={optional} badge={badge} messages={messages}>
      {stepper ? (
        <div className={styles.step} data-state={state}>
          <button
            type="button"
            onClick={() => bump(-1)}
            disabled={disabled || value === null || value <= lo}
            aria-label={t("decrease", { name: who })}
          >
            <Icon name="minus" size={20} />
          </button>
          {input}
          <button type="button" onClick={() => bump(1)} disabled={disabled || (value !== null && value >= hi)} aria-label={t("increase", { name: who })}>
            <Icon name="plus" size={20} />
          </button>
        </div>
      ) : (
        <span className={cx(fieldStyles.ctl, styles.plain)} data-state={state}>
          {input}
          {suffix ? <span className={fieldStyles.prefix}>{suffix}</span> : null}
        </span>
      )}
    </FormField>
  );
}
