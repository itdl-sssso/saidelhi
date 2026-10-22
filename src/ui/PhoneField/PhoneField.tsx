"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { FormField, fieldDescribedBy, hasError, hasWarning, type FieldNote } from "../FormField/FormField";
import fieldStyles from "../FormField/FormField.module.css";
import { formatPhoneMask, phoneDigits } from "./phone";

export type PhoneFieldProps = {
  id: string;
  label: ReactNode;
  /** The 10 national digits (no +91, no spaces). */
  value: string;
  onChange: (digits: string) => void;
  help?: ReactNode;
  optional?: boolean;
  badge?: ReactNode;
  messages?: FieldNote[];
  disabled?: boolean;
  autoFocus?: boolean;
  onEnter?: () => void;
};

/** +91 prefix, phone keypad, "98765 43210" mask. Pasting "+91 98765-43210" works too. */
export function PhoneField({ id, label, value, onChange, help, optional, badge, messages, disabled, autoFocus, onEnter }: PhoneFieldProps) {
  const t = useTranslations("fieldKit");
  const state = hasError(messages) ? "error" : hasWarning(messages) ? "warning" : undefined;
  return (
    <FormField id={id} label={label} help={help} optional={optional} badge={badge} messages={messages}>
      <span className={fieldStyles.ctl} data-state={state} style={{ maxWidth: 320 }}>
        <span className={fieldStyles.prefix} aria-hidden="true">
          +91
        </span>
        <input
          id={id}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          enterKeyHint="send"
          placeholder="98765 43210"
          value={formatPhoneMask(value)}
          disabled={disabled}
          autoFocus={autoFocus}
          onChange={(e) => onChange(phoneDigits(e.target.value))}
          onKeyDown={(e) => {
            if (e.key === "Enter" && onEnter) {
              e.preventDefault();
              onEnter();
            }
          }}
          aria-invalid={state === "error" || undefined}
          aria-describedby={[fieldDescribedBy(id, { help, messages }), `${id}-cc`].filter(Boolean).join(" ")}
          className={fieldStyles.tabular}
        />
        <span id={`${id}-cc`} className="sr-only">
          {t("countryCode")}
        </span>
      </span>
    </FormField>
  );
}
