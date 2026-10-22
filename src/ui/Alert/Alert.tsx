import type { HTMLAttributes, ReactNode } from "react";
import { Icon, type IconName } from "../Icon";
import { cx } from "../cx";
import styles from "./Alert.module.css";

export type AlertTone = "note" | "info" | "success" | "attention" | "error";

const ICONS: Record<AlertTone, IconName> = {
  note: "sun",
  info: "info",
  success: "circle-check",
  attention: "circle-alert",
  error: "circle-x",
};

export type AlertProps = Omit<HTMLAttributes<HTMLDivElement>, "title"> & {
  tone?: AlertTone;
  title?: ReactNode;
};

/** Inline message. Errors are announced assertively; everything else politely. */
export function Alert({ tone = "note", title, className, children, ...rest }: AlertProps) {
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cx(styles.root, styles[tone], className)} {...rest}>
      <span className={styles.icon}>
        <Icon name={ICONS[tone]} size={18} />
      </span>
      <div className={styles.body}>
        {title ? <strong className={styles.title}>{title}</strong> : null}
        {children}
      </div>
    </div>
  );
}
