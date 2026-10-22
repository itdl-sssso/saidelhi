import type { ReactNode } from "react";
import { Icon } from "../Icon";
import { cx } from "../cx";
import styles from "./Stepper.module.css";

export type StepperProps = {
  steps: ReactNode[];
  /** Zero-based index of the current step. */
  current: number;
  label: string;
  className?: string;
};

export function Stepper({ steps, current, label, className }: StepperProps) {
  return (
    <ol className={cx(styles.list, className)} aria-label={label}>
      {steps.map((step, i) => {
        const state = i < current ? "done" : i === current ? "current" : "upcoming";
        return (
          <li
            key={i}
            className={cx(styles.step, state === "done" && styles.done, state === "current" && styles.current)}
            aria-current={state === "current" ? "step" : undefined}
          >
            <span className={styles.num} aria-hidden="true">
              {state === "done" ? <Icon name="check" size={16} /> : i + 1}
            </span>
            {step}
          </li>
        );
      })}
    </ol>
  );
}
