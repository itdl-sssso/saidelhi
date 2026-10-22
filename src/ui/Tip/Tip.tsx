import { useId, type ReactNode } from "react";
import { cx } from "../cx";
import styles from "./Tip.module.css";

export type TipProps = {
  /** Tooltip text; also read by screen readers via aria-describedby. */
  tip: string;
  children: ReactNode;
  align?: "start" | "end";
  /** Set false when the trigger already carries the same text for screen readers. */
  describe?: boolean;
  className?: string;
};

/** Focusable trigger with a hover/focus tooltip. CSS only, so it works in Server Components. */
export function Tip({ tip, children, align = "start", describe = true, className }: TipProps) {
  const id = useId();
  return (
    <span className={cx(styles.root, align === "end" && styles.end, className)}>
      <span className={styles.trigger} tabIndex={0} aria-describedby={describe ? id : undefined}>
        {children}
      </span>
      <span id={id} role="tooltip" aria-hidden={!describe || undefined} className={styles.body}>
        {tip}
      </span>
    </span>
  );
}
