import type { HTMLAttributes } from "react";
import { Icon, type IconName } from "../Icon";
import { cx } from "../cx";
import styles from "./Badge.module.css";

export type BadgeTone = "prem" | "shanti" | "sathya" | "neutral";

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone;
  icon?: IconName;
};

export function Badge({ tone = "neutral", icon, className, children, ...rest }: BadgeProps) {
  return (
    <span className={cx(styles.badge, styles[tone], className)} {...rest}>
      {icon ? <Icon name={icon} size={16} /> : null}
      {children}
    </span>
  );
}
