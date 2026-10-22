import type { ReactNode } from "react";
import { cx } from "../cx";
import styles from "./ColorToken.module.css";

export type ColorTokenProps = {
  name: ReactNode;
  /** Any CSS colour, typically a token reference such as var(--pink-200). */
  value: string;
  /** Text printed on the swatch, e.g. the hex value. */
  swatchLabel?: string;
  meaning?: ReactNode;
  variable?: string;
  onDark?: boolean;
  className?: string;
};

export function ColorToken({ name, value, swatchLabel, meaning, variable, onDark, className }: ColorTokenProps) {
  return (
    <figure className={cx(styles.root, className)}>
      <div className={cx(styles.swatch, onDark && styles.onDark)} style={{ background: value }}>
        {swatchLabel}
      </div>
      <figcaption className={styles.meta}>
        <span className={styles.name}>{name}</span>
        {meaning ? <span className={styles.meaning}>{meaning}</span> : null}
        {variable ? <code className={styles.variable}>{variable}</code> : null}
      </figcaption>
    </figure>
  );
}
