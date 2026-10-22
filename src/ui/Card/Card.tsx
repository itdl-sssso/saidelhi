import type { HTMLAttributes } from "react";
import { cx } from "../cx";
import styles from "./Card.module.css";

export type CardTone = "plain" | "calm" | "warm" | "truth";

export type CardProps = HTMLAttributes<HTMLElement> & {
  as?: "div" | "article" | "section" | "li" | "aside";
  tone?: CardTone;
  /** 6px Sarva Dharma cap along the top edge. */
  capped?: boolean;
  /** Lifts on hover; use when the card holds its own link or button. */
  interactive?: boolean;
  /** Removes body padding, e.g. for edge-to-edge media. */
  flush?: boolean;
};

export function Card({
  as: Tag = "div",
  tone = "plain",
  capped,
  interactive,
  flush,
  className,
  children,
  ...rest
}: CardProps) {
  return (
    <Tag className={cx(styles.card, styles[tone], interactive && styles.interactive, className)} {...rest}>
      {capped ? <div className={styles.cap} role="presentation" /> : null}
      <div className={cx(styles.body, flush && styles.flush)}>{children}</div>
    </Tag>
  );
}
