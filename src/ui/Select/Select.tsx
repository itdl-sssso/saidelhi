import { useId, type SelectHTMLAttributes } from "react";
import { Icon } from "../Icon";
import { Field, describedBy, type FieldChrome } from "../Input/Field";
import inputStyles from "../Input/Input.module.css";
import { cx } from "../cx";
import styles from "./Select.module.css";

export type SelectOption = { value: string; label: string; disabled?: boolean };

export type SelectProps = FieldChrome &
  SelectHTMLAttributes<HTMLSelectElement> & {
    options: SelectOption[];
    placeholder?: string;
  };

export function Select({
  id,
  label,
  hint,
  error,
  optional,
  options,
  placeholder,
  className,
  ...rest
}: SelectProps) {
  const autoId = useId();
  const uid = id ?? autoId;
  return (
    <Field id={uid} label={label} hint={hint} error={error} optional={optional}>
      <span className={styles.wrap}>
        <select
          id={uid}
          className={cx(inputStyles.control, styles.select, className)}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(uid, { hint, error })}
          {...rest}
        >
          {placeholder ? <option value="">{placeholder}</option> : null}
          {options.map((o) => (
            <option key={o.value} value={o.value} disabled={o.disabled}>
              {o.label}
            </option>
          ))}
        </select>
        <span className={styles.chevron}>
          <Icon name="chevron-down" size={16} />
        </span>
      </span>
    </Field>
  );
}
