import type { InputHTMLAttributes, ReactNode } from "react";
import { cx } from "../cx";
import styles from "./Switch.module.css";

export type SwitchProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "role"> & {
  label: ReactNode;
};

export function Switch({ label, className, ...rest }: SwitchProps) {
  return (
    <label className={cx(styles.root, className)}>
      <input type="checkbox" role="switch" className={styles.track} {...rest} />
      {label}
    </label>
  );
}
