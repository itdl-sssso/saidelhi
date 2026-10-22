import type { HTMLAttributes } from "react";
import { cx } from "../cx";
import styles from "./Eyebrow.module.css";

export type EyebrowTone = "calm" | "warm" | "muted" | "inverse";

export type EyebrowProps = HTMLAttributes<HTMLParagraphElement> & { tone?: EyebrowTone };

export function Eyebrow({ tone = "calm", className, ...rest }: EyebrowProps) {
  return <p className={cx(styles.eyebrow, styles[tone], className)} {...rest} />;
}
