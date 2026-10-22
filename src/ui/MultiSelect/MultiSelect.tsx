"use client";

import type { ReactNode } from "react";
import { Icon } from "../Icon";
import { FormField, fieldDescribedBy, fieldIds, hasError, type FieldNote } from "../FormField/FormField";
import styles from "./MultiSelect.module.css";

export type ChipOption = { value: string; label: ReactNode };

export type MultiSelectProps = {
  id: string;
  label: ReactNode;
  options: ChipOption[];
  value: string[];
  onChange: (value: string[]) => void;
  help?: ReactNode;
  optional?: boolean;
  badge?: ReactNode;
  messages?: FieldNote[];
  /** Single choice: chips behave like radios (pick one, tap again to clear). */
  single?: boolean;
  disabled?: boolean;
};

/** Chips that toggle. Each chip is a pressed/unpressed button; selection also shows a tick, not colour alone. */
export function MultiSelect({ id, label, options, value, onChange, help, optional, badge, messages, single, disabled }: MultiSelectProps) {
  const toggle = (v: string) => {
    if (single) onChange(value.includes(v) ? [] : [v]);
    else onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  };
  return (
    <FormField id={id} label={label} help={help} optional={optional} badge={badge} messages={messages} kind="group">
      <div
        id={id}
        role="group"
        aria-labelledby={fieldIds(id).label}
        aria-describedby={fieldDescribedBy(id, { help, messages })}
        className={styles.chips}
        data-state={hasError(messages) ? "error" : undefined}
      >
        {options.map((o) => {
          const on = value.includes(o.value);
          return (
            <button key={o.value} type="button" className={styles.chip} aria-pressed={on} disabled={disabled} onClick={() => toggle(o.value)}>
              {on ? <Icon name="check" size={16} /> : null}
              {o.label}
            </button>
          );
        })}
      </div>
    </FormField>
  );
}
