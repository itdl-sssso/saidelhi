import type { InputHTMLAttributes, ReactNode } from "react";
import { Icon } from "../Icon";
import { cx } from "../cx";
import styles from "./Checkbox.module.css";

export type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: ReactNode;
};

export function Checkbox({ label, className, ...rest }: CheckboxProps) {
  return (
    <label className={cx(styles.root, className)}>
      <input type="checkbox" className={styles.input} {...rest} />
      <span className={styles.box} aria-hidden="true">
        <Icon name="check" size={16} />
      </span>
      {label}
    </label>
  );
}
