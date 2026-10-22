import { useLocale } from "next-intl";
import type { EventCard } from "@/contract";
import { formatDateLong, formatTime, pickText, type AppLocale } from "@/lib/format";
import styles from "./formlink.module.css";

/** Title, date, venue and samithi of the event a link belongs to (spec 19). */
export function EventSummary({ event, purpose }: { event: EventCard; purpose?: string }) {
  const locale = useLocale() as AppLocale;
  const title = pickText(event.title, locale).text;
  return (
    <section className={styles.eventCard} aria-label={title}>
      {purpose ? <span className={styles.purpose}>{purpose}</span> : null}
      <h2 className={styles.eventTitle}>{title}</h2>
      <p className={styles.eventMeta}>
        {formatDateLong(event.startsAt, locale)} · {formatTime(event.startsAt, locale)}
      </p>
      <p className={styles.eventMeta}>
        {event.venue.name}
        {` · ${pickText(event.samithi.name, locale).text}`}
      </p>
    </section>
  );
}
