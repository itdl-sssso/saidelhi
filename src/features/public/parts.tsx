import { Fragment, type ElementType, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { EventPublic, I18nText } from "@/contract";
import { Link } from "@/i18n/navigation";
import { type AppLocale, formatDayMonth, istParts, monthName, pickText } from "@/lib/format";
import { Breadcrumb, type Crumb } from "@/ui/Breadcrumb";
import { cx } from "@/ui/cx";
import { FigureValue } from "@/ui/Figure";
import { Icon } from "@/ui/Icon";
import { volunteersStillNeeded } from "./seva";
import styles from "./public.module.css";

export { styles as pub };

/** Blue-50 → cream page hero with an optional breadcrumb. */
export function PageHero({ crumbs, children, className }: { crumbs?: Crumb[]; children: ReactNode; className?: string }) {
  return (
    <section className={cx(styles.hero, className)}>
      <div className={styles.wrap}>
        {crumbs ? <Breadcrumb items={crumbs} className={styles.crumb} /> : null}
        <div className={styles.heroBody}>{children}</div>
      </div>
    </section>
  );
}

export function SectionHead({
  id,
  title,
  sub,
  action,
  level = 2,
}: {
  id?: string;
  title: ReactNode;
  sub?: ReactNode;
  action?: ReactNode;
  level?: 2 | 3;
}) {
  const H = `h${level}` as const;
  return (
    <div className={styles.sechd}>
      <div>
        <H id={id} className={level === 2 ? styles.h2 : styles.h3}>
          {title}
        </H>
        {sub ? <p>{sub}</p> : null}
      </div>
      {action}
    </div>
  );
}

/**
 * Renders a bilingual content field in the reader's language. When Hindi is missing the
 * English text shows silently (CONTRACT §6) but is marked lang="en" for screen readers.
 */
export function LocalText({ value, as: Tag = "span", className }: { value: I18nText; as?: ElementType; className?: string }) {
  const locale = useLocale() as AppLocale;
  const p = pickText(value, locale);
  return (
    <Tag className={className} lang={p.fallback ? p.lang : undefined}>
      {p.text}
    </Tag>
  );
}

export function DateChip({ at, className }: { at: string; className?: string }) {
  const locale = useLocale() as AppLocale;
  const p = istParts(at);
  return (
    <span className={cx(styles.dchip, className)} aria-hidden="true">
      <b>{p.d}</b>
      <span>{monthName(p.m, locale)}</span>
    </span>
  );
}

export function VolunteersBadge({ event }: { event: Pick<EventPublic, "volunteersNeeded" | "volunteersJoined" | "status"> }) {
  const t = useTranslations("events");
  const n = volunteersStillNeeded(event);
  if (n === null) return null;
  return (
    <span className={styles.volb}>
      <Icon name="hand-heart" size={16} />
      {t("volunteersNeeded", { count: n })}
    </span>
  );
}

/** Row in a flush card list linking to an Event page: date, title, one-line summary. */
export function EventLinkRow({ event, summary, chip }: { event: EventPublic; summary?: ReactNode; chip?: boolean }) {
  const locale = useLocale() as AppLocale;
  return (
    <li>
      <Link href={`/events/${event.id}`} className={styles.ev}>
        {chip ? <DateChip at={event.startsAt} /> : <span className={styles.evDate}>{formatDayMonth(event.startsAt, locale)}</span>}
        <span className={styles.col} style={{ gap: 4 }}>
          <LocalText value={event.title} className={styles.evTitle} />
          {summary}
        </span>
        <Icon name="chevron-right" size={18} />
      </Link>
    </li>
  );
}

/** External link with the "opens in a new tab" hint for screen readers. */
export function ExternalLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  const t = useTranslations("common");
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
      <Icon name="external-link" size={16} />
      <span className="sr-only"> {t("opensNewTab")}</span>
    </a>
  );
}

/** "115 People screened · 63 Spectacles given" from the approved result tiles. */
export function ResultSummary({ event }: { event: EventPublic }) {
  const tiles = event.results?.tiles.filter((x) => x.figure.value !== null).slice(0, 2) ?? [];
  if (!tiles.length) return null;
  return (
    <span className={styles.small}>
      {tiles.map((tile, i) => (
        <Fragment key={tile.key}>
          {i ? " · " : null}
          <FigureValue value={tile.figure.value} inline /> <LocalText value={tile.label} />
        </Fragment>
      ))}
    </span>
  );
}
