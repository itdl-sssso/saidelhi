import { cx } from "../cx";
import styles from "./Meter.module.css";

export type MeterProps = {
  value: number;
  max: number | null;
  /** Accessible text, e.g. "5 of 6 Sevadal". */
  label: string;
  /** Visible caption beside the bar (defaults to the label). */
  caption?: string;
  tone?: "pink" | "green" | "yellow";
  className?: string;
};

/** Small "5 of 6" fill meter (Sevadal, capacity). With no max the bar is empty and only the caption shows. */
export function Meter({ value, max, label, caption, tone = "pink", className }: MeterProps) {
  const pct = max && max > 0 ? Math.max(0, Math.min(100, Math.round((value / max) * 100))) : 0;
  return (
    <div className={cx(styles.root, className)}>
      <div className={styles.track} role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={max ?? Math.max(value, 1)} aria-valuenow={value}>
        <i className={styles[tone]} style={{ width: `${pct}%` }} />
      </div>
      <span className={styles.cap}>{caption ?? label}</span>
    </div>
  );
}
