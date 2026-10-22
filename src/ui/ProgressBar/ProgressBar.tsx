import type { ReactNode } from "react";
import { cx } from "../cx";
import styles from "./ProgressBar.module.css";

export type ProgressBarProps = {
  /** 0–100. */
  value: number;
  /** Accessible name of the bar ("Report progress"). */
  label: string;
  /** Left caption, e.g. "Step 3 of 8 · Spectacles". */
  caption?: ReactNode;
  /** Right caption; defaults to the percentage. */
  trailing?: ReactNode;
  /** Pins the bar to the top of the scroll container (form header). */
  sticky?: boolean;
  className?: string;
};

/** Thin pink progress bar with a caption row (form header). */
export function ProgressBar({ value, label, caption, trailing, sticky, className }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className={cx(styles.root, sticky && styles.sticky, className)}>
      {caption || trailing !== null ? (
        <div className={styles.caption}>
          <span>{caption}</span>
          <span aria-hidden="true">{trailing ?? `${pct}%`}</span>
        </div>
      ) : null}
      <div className={styles.track} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
        <i style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
