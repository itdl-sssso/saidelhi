import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import { Icon, type IconName } from "../Icon";
import { cx } from "../cx";
import { FormField, fieldDescribedBy, hasError, hasWarning, type FieldNote } from "./FormField";
import styles from "./FormField.module.css";
import area from "./TextArea.module.css";

type Chrome = {
  id: string;
  label: ReactNode;
  help?: ReactNode;
  optional?: boolean;
  badge?: ReactNode;
  messages?: FieldNote[];
};

const stateOf = (messages?: FieldNote[]) => (hasError(messages) ? "error" : hasWarning(messages) ? "warning" : undefined);

export type TextFieldProps = Chrome &
  Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "value" | "onChange"> & {
    value: string;
    onChange: (value: string) => void;
    icon?: IconName;
  };

/** Single-line text in the kit's control box. */
export function TextField({ id, label, help, optional, badge, messages, value, onChange, icon, className, ...rest }: TextFieldProps) {
  return (
    <FormField id={id} label={label} help={help} optional={optional} badge={badge} messages={messages}>
      <span className={cx(styles.ctl, className)} data-state={stateOf(messages)}>
        {icon ? (
          <span className={styles.ctlIcon}>
            <Icon name={icon} size={18} />
          </span>
        ) : null}
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={hasError(messages) || undefined}
          aria-describedby={fieldDescribedBy(id, { help, messages })}
          {...rest}
        />
      </span>
    </FormField>
  );
}

export type TextAreaFieldProps = Chrome &
  Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id" | "value" | "onChange"> & {
    value: string;
    onChange: (value: string) => void;
  };

export function TextAreaField({ id, label, help, optional, badge, messages, value, onChange, rows = 4, className, ...rest }: TextAreaFieldProps) {
  return (
    <FormField id={id} label={label} help={help} optional={optional} badge={badge} messages={messages}>
      <textarea
        id={id}
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cx(area.area, className)}
        data-state={stateOf(messages)}
        aria-invalid={hasError(messages) || undefined}
        aria-describedby={fieldDescribedBy(id, { help, messages })}
        {...rest}
      />
    </FormField>
  );
}
