"use client";

import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "../Icon";
import { FormField, fieldDescribedBy, fieldIds, hasError, type FieldNote } from "../FormField/FormField";
import styles from "./YesNo.module.css";

export type YesNoProps = {
  id: string;
  label: ReactNode;
  value: boolean | null;
  onChange: (value: boolean) => void;
  help?: ReactNode;
  optional?: boolean;
  badge?: ReactNode;
  messages?: FieldNote[];
  yesLabel?: ReactNode;
  noLabel?: ReactNode;
  disabled?: boolean;
};

/** Two big radio buttons. Arrow keys move between them, like a native radio group. */
export function YesNo({ id, label, value, onChange, help, optional, badge, messages, yesLabel, noLabel, disabled }: YesNoProps) {
  const t = useTranslations("fieldKit");
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const choices: Array<{ v: boolean; text: ReactNode }> = [
    { v: true, text: yesLabel ?? t("yes") },
    { v: false, text: noLabel ?? t("no") },
  ];
  // Roving tab stop: the checked option, or the first when nothing is chosen yet.
  const tabIndexOf = (v: boolean) => (value === null ? (v ? 0 : -1) : value === v ? 0 : -1);

  const onKey = (e: KeyboardEvent, i: number) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return;
    e.preventDefault();
    const next = i === 0 ? 1 : 0;
    refs.current[next]?.focus();
    onChange(choices[next].v);
  };

  return (
    <FormField id={id} label={label} help={help} optional={optional} badge={badge} messages={messages} kind="group">
      <div
        id={id}
        role="radiogroup"
        aria-labelledby={fieldIds(id).label}
        aria-describedby={fieldDescribedBy(id, { help, messages })}
        aria-invalid={hasError(messages) || undefined}
        className={styles.yn}
        data-state={hasError(messages) ? "error" : undefined}
      >
        {choices.map((c, i) => (
          <button
            key={String(c.v)}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={value === c.v}
            tabIndex={tabIndexOf(c.v)}
            disabled={disabled}
            onClick={() => onChange(c.v)}
            onKeyDown={(e) => onKey(e, i)}
          >
            {value === c.v ? <Icon name="check" size={18} /> : null}
            {c.text}
          </button>
        ))}
      </div>
    </FormField>
  );
}
