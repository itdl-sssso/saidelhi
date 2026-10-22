import type { ReactNode } from "react";
import { Eyebrow } from "../Eyebrow";
import { Icon } from "../Icon";
import { cx } from "../cx";
import styles from "./QuoteCard.module.css";

export type QuoteCardProps = {
  quote: ReactNode;
  attribution: ReactNode;
  label?: ReactNode;
  date?: ReactNode;
  /** Machine-readable date for the <time> element. */
  dateTime?: string;
  className?: string;
};

export function QuoteCard({ quote, attribution, label, date, dateTime, className }: QuoteCardProps) {
  return (
    <figure className={cx(styles.root, className)}>
      <div className={styles.head}>
        {label ? <Eyebrow tone="warm">{label}</Eyebrow> : null}
        {date ? (
          <time className={styles.date} dateTime={dateTime}>
            {date}
          </time>
        ) : null}
      </div>
      <span className={styles.mark}>
        <Icon name="quote" size={24} />
      </span>
      <blockquote className={styles.quote}>{quote}</blockquote>
      <figcaption className={styles.attribution}>— {attribution}</figcaption>
    </figure>
  );
}
