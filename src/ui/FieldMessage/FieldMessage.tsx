import type { ReactNode } from "react";
import { Icon, type IconName } from "../Icon";
import { cx } from "../cx";
import styles from "./FieldMessage.module.css";

/** error = red and blocks; warning = yellow, never blocks; check = green confirmation; info = blue note. */
export type FieldMessageType = "error" | "warning" | "check" | "info";

const ICONS: Record<FieldMessageType, IconName> = {
  error: "circle-x",
  warning: "triangle-alert",
  check: "circle-check",
  info: "info",
};

export type FieldMessageProps = {
  type?: FieldMessageType;
  id?: string;
  children: ReactNode;
  className?: string;
  /** Hidden prefix read before the text ("Error:", "Check:") so meaning never rests on colour. */
  srPrefix?: string;
};

/** Inline message under a field: icon + text, never colour alone. Announced by the form's live region, not here. */
export function FieldMessage({ type = "error", id, children, className, srPrefix }: FieldMessageProps) {
  return (
    <div id={id} className={cx(styles.msg, styles[type], className)} data-type={type}>
      <span className={styles.icon}>
        <Icon name={ICONS[type]} size={16} />
      </span>
      <span>
        {srPrefix ? <span className="sr-only">{srPrefix} </span> : null}
        {children}
      </span>
    </div>
  );
}
