import { useId, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cx } from "../cx";
import { Field, describedBy, type FieldChrome } from "./Field";
import styles from "./Input.module.css";

export type InputProps = FieldChrome & InputHTMLAttributes<HTMLInputElement>;

export function Input({ id, label, hint, error, optional, className, ...rest }: InputProps) {
  const autoId = useId();
  const uid = id ?? autoId;
  return (
    <Field id={uid} label={label} hint={hint} error={error} optional={optional}>
      <input
        id={uid}
        className={cx(styles.control, className)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(uid, { hint, error })}
        {...rest}
      />
    </Field>
  );
}

export type TextareaProps = FieldChrome & TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textarea({ id, label, hint, error, optional, className, rows = 4, ...rest }: TextareaProps) {
  const autoId = useId();
  const uid = id ?? autoId;
  return (
    <Field id={uid} label={label} hint={hint} error={error} optional={optional}>
      <textarea
        id={uid}
        rows={rows}
        className={cx(styles.control, className)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(uid, { hint, error })}
        {...rest}
      />
    </Field>
  );
}
