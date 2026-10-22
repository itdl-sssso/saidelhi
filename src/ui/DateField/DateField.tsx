"use client";

import type { ReactNode } from "react";
import { Icon, type IconName } from "../Icon";
import { FormField, fieldDescribedBy, hasError, hasWarning, type FieldNote } from "../FormField/FormField";
import fieldStyles from "../FormField/FormField.module.css";

type Common = {
  id: string;
  label: ReactNode;
  /** 'YYYY-MM-DD' for dates, 'HH:mm' for times; '' when blank. */
  value: string;
  onChange: (value: string) => void;
  help?: ReactNode;
  optional?: boolean;
  badge?: ReactNode;
  messages?: FieldNote[];
  disabled?: boolean;
  min?: string;
  max?: string;
};

function NativeField({ type, icon, ...p }: Common & { type: "date" | "time"; icon: IconName }) {
  const state = hasError(p.messages) ? "error" : hasWarning(p.messages) ? "warning" : undefined;
  return (
    <FormField id={p.id} label={p.label} help={p.help} optional={p.optional} badge={p.badge} messages={p.messages}>
      <span className={fieldStyles.ctl} data-state={state} style={{ maxWidth: 260 }}>
        <span className={fieldStyles.ctlIcon}>
          <Icon name={icon} size={18} />
        </span>
        <input
          id={p.id}
          type={type}
          value={p.value}
          min={p.min}
          max={p.max}
          disabled={p.disabled}
          onChange={(e) => p.onChange(e.target.value)}
          aria-invalid={state === "error" || undefined}
          aria-describedby={fieldDescribedBy(p.id, { help: p.help, messages: p.messages })}
        />
      </span>
    </FormField>
  );
}

export type DateFieldProps = Common;
export type TimeFieldProps = Common;

/** Native date picker (the phone's own calendar), value 'YYYY-MM-DD'. */
export function DateField(props: DateFieldProps) {
  return <NativeField {...props} type="date" icon="calendar-days" />;
}

/** Native time picker, value 'HH:mm' (24-hour, shown in the phone's own format). */
export function TimeField(props: TimeFieldProps) {
  return <NativeField {...props} type="time" icon="clock" />;
}
