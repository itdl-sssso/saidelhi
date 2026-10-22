import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { Badge, type BadgeTone } from "../Badge";
import { Icon } from "../Icon";
import { cx } from "../cx";
import styles from "./EventScheduleCard.module.css";

export type ScheduleEvent = {
  id: string;
  /** Short month label for the date chip, e.g. "Oct". */
  month: string;
  day: string;
  /** ISO date for the <time> element. */
  dateTime?: string;
  name: ReactNode;
  time?: ReactNode;
  venue?: ReactNode;
  /** Right-hand slot, e.g. a Badge or StatusPill. */
  tag?: ReactNode;
  tagTone?: BadgeTone;
  href?: string;
};

export type EventScheduleCardProps = {
  title: ReactNode;
  events: ScheduleEvent[];
  footer?: ReactNode;
  className?: string;
};

export function EventScheduleCard({ title, events, footer, className }: EventScheduleCardProps) {
  return (
    <section className={cx(styles.root, className)}>
      <header className={styles.head}>
        <Icon name="calendar-days" size={20} />
        <h3 className={styles.title}>{title}</h3>
      </header>
      <ul className={styles.list}>
        {events.map((e) => (
          <li key={e.id} className={cx(styles.item, e.href && styles.linked)}>
            <time className={styles.date} dateTime={e.dateTime}>
              <span className={styles.month}>{e.month}</span>
              <span className={styles.day}>{e.day}</span>
            </time>
            <div className={styles.main}>
              <div className={styles.name}>
                {e.href ? (
                  <Link href={e.href} className={styles.link}>
                    {e.name}
                  </Link>
                ) : (
                  e.name
                )}
              </div>
              <div className={styles.meta}>
                {e.time ? (
                  <span>
                    <Icon name="clock" size={16} />
                    {e.time}
                  </span>
                ) : null}
                {e.venue ? (
                  <span>
                    <Icon name="map-pin" size={16} />
                    {e.venue}
                  </span>
                ) : null}
              </div>
            </div>
            {typeof e.tag === "string" ? <Badge tone={e.tagTone ?? "shanti"}>{e.tag}</Badge> : e.tag}
          </li>
        ))}
      </ul>
      {footer ? <div className={styles.footer}>{footer}</div> : null}
    </section>
  );
}
