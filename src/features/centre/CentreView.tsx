import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import type { CentreDetail, EventPublic, Gathering } from "@/contract";
import { Link } from "@/i18n/navigation";
import { type AppLocale, formatPeriodRange, formatTime, mapsUrl, pickText, tx, weekdayName } from "@/lib/format";
import {
  EventLinkRow,
  ExternalLink,
  LocalText,
  PageHero,
  ResultSummary,
  SectionHead,
  VolunteersBadge,
  pub,
} from "@/features/public/parts";
import { GATHERING_ICON } from "@/features/public/seva";
import { Badge } from "@/ui/Badge";
import { Button } from "@/ui/Button";
import { cx } from "@/ui/cx";
import { EmptyState } from "@/ui/EmptyState";
import { Icon } from "@/ui/Icon";
import { KpiTile } from "@/ui/KpiTile";
import { CopyNumber } from "./CopyNumber";
import styles from "./CentreView.module.css";

/** Monday-first week, so Sunday gatherings close the table. */
const weekOrder = (g: Gathering) => (g.day + 6) % 7;

export function CentreView({ centre }: { centre: CentreDetail }) {
  const t = useTranslations("centre");
  const locale = useLocale() as AppLocale;
  const name = pickText(centre.name, locale);
  const district = tx(centre.district.name, locale);
  const hasAnything =
    centre.schedule.length > 0 || centre.upcoming.length > 0 || centre.past.length > 0 || centre.thisYear !== null;

  return (
    <>
      <PageHero
        crumbs={[
          { label: t("crumbHome"), href: "/" },
          { label: t("crumbCentres"), href: "/centres/map" },
          { label: t("districtName", { name: district }), href: `/districts/${centre.district.slug}` },
          { label: <span lang={name.fallback ? "en" : undefined}>{name.text}</span> },
        ]}
      >
        <div className={styles.head}>
          <div className={pub.col} style={{ gap: 14 }}>
            <div className={pub.row}>
              <Link href={`/districts/${centre.district.slug}`} className={styles.badgeLink}>
                <Badge tone="shanti" icon="map">
                  {t("districtName", { name: district })}
                </Badge>
              </Link>
            </div>
            <h1 className={pub.h1} lang={name.fallback ? "en" : undefined}>
              {name.text}
            </h1>
            <p className={pub.lead}>{t("lead")}</p>
            <div className={styles.address}>
              <Icon name="map-pin" size={18} />
              <span>
                <LocalText value={centre.address} />
                {centre.pincode ? ` ${centre.pincode}` : null}
                <br />
                <ExternalLink
                  className={styles.mapsLink}
                  href={mapsUrl({ name: centre.name.en, address: centre.address.en, geo: centre.geo })}
                >
                  {t("openInMaps")}
                </ExternalLink>
              </span>
            </div>
          </div>
          {centre.contactPhone ? (
            <div className={pub.col} style={{ gap: 10 }}>
              <h2 className={styles.contactHeading}>{t("contactHeading")}</h2>
              <CopyNumber phone={centre.contactPhone} label={t("contactLabel")} />
              <p className={pub.cap}>{t("contactNote")}</p>
            </div>
          ) : null}
        </div>
      </PageHero>

      <section className={pub.section} style={{ paddingTop: "var(--space-6)" }}>
        <div className={cx(pub.wrap, pub.stack)}>
          {hasAnything ? (
            <>
              {centre.schedule.length || centre.upcoming.length ? (
                <div className={styles.twoUp}>
                  {centre.schedule.length ? <Schedule schedule={centre.schedule} /> : null}
                  <Upcoming events={centre.upcoming} samithi={centre.samithi.slug} />
                </div>
              ) : null}
              <ThisYear centre={centre} />
              {centre.past.length ? <Past events={centre.past} /> : null}
              {centre.photos.length ? (
                <div>
                  <SectionHead title={t("photosHeading")} />
                  <div className={pub.photos}>
                    {centre.photos.map((p) => (
                      <figure key={p.url} className={pub.photo}>
                        <Image src={p.url} alt={tx(p.alt, locale)} fill sizes="(min-width: 768px) 25vw, 50vw" />
                      </figure>
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <div className={pub.card}>
              <EmptyState
                icon="sprout"
                headingLevel={2}
                title={t("emptyTitle")}
                body={t("emptyBody")}
                action={
                  <Button href="/calendar" variant="outline" iconAfter="arrow-right">
                    {t("seeCalendar")}
                  </Button>
                }
              />
            </div>
          )}
        </div>
      </section>
    </>
  );
}

function Schedule({ schedule }: { schedule: Gathering[] }) {
  const t = useTranslations("centre");
  const tg = useTranslations("gathering");
  const locale = useLocale() as AppLocale;
  const rows = [...schedule].sort((a, b) => weekOrder(a) - weekOrder(b) || a.time.localeCompare(b.time));
  return (
    <div>
      <SectionHead title={t("weeklyHeading")} sub={t("weeklySub")} />
      <table className={cx(pub.tbl, styles.schedule)}>
        <caption className="sr-only">{t("weeklyHeading")}</caption>
        <thead>
          <tr>
            <th scope="col">{t("colDay")}</th>
            <th scope="col">{t("colTime")}</th>
            <th scope="col">{t("colGathering")}</th>
            <th scope="col">{t("colLanguage")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((g, i) => (
            <tr key={i}>
              <th scope="row">{weekdayName(g.day, locale)}</th>
              <td className={styles.nowrap}>{formatTime(g.time, locale)}</td>
              <td>
                <span className={styles.kind}>
                  <Icon name={GATHERING_ICON[g.kind]} size={18} />
                  {tg(g.kind)}
                </span>
              </td>
              <td>{tg(`lang_${g.language}`)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Upcoming({ events, samithi }: { events: EventPublic[]; samithi: string }) {
  const t = useTranslations("centre");
  return (
    <div>
      <SectionHead
        title={t("upcomingHeading")}
        action={
          <Link href={`/calendar?samithi=${samithi}`} className={pub.more}>
            {t("fullCalendar")}
            <Icon name="arrow-right" size={16} />
          </Link>
        }
      />
      {events.length ? (
        <div className={cx(pub.card, pub.cardFlush)}>
          <ul className={pub.evlist}>
            {events.map((e) => (
              <EventLinkRow key={e.id} event={e} chip summary={<UpcomingMeta event={e} />} />
            ))}
          </ul>
        </div>
      ) : (
        <p className={pub.small}>{t("noUpcoming")}</p>
      )}
    </div>
  );
}

function UpcomingMeta({ event }: { event: EventPublic }) {
  const locale = useLocale() as AppLocale;
  return (
    <>
      <span className={pub.cap}>
        {formatTime(event.startsAt, locale)} · {event.venue.name}
      </span>
      <VolunteersBadge event={event} />
    </>
  );
}

function ThisYear({ centre }: { centre: CentreDetail }) {
  const t = useTranslations("centre");
  const locale = useLocale() as AppLocale;
  if (!centre.thisYear || centre.thisYear.length === 0) {
    return (
      <div>
        <SectionHead title={t("thisYearHeading")} />
        <p className={pub.small}>{t("emptyTitle")}</p>
      </div>
    );
  }
  const period = centre.thisYear[0].period;
  const periodText = formatPeriodRange(period.from, period.to, locale, (to) => t("upTo", { date: to }));
  return (
    <div>
      <SectionHead title={t("thisYearHeading")} sub={t("thisYearSub", { period: periodText })} />
      <div className={styles.kpis}>
        {centre.thisYear.map((k) => (
          <KpiTile key={k.key} label={<LocalText value={k.label} />} figure={k.figure} period={tx(period.label, locale)} />
        ))}
      </div>
      <p className={pub.cap} style={{ marginTop: 10 }}>
        {t("thisYearNote")}
      </p>
    </div>
  );
}

function Past({ events }: { events: EventPublic[] }) {
  const t = useTranslations("centre");
  return (
    <div>
      <SectionHead title={t("pastHeading")} />
      <div className={cx(pub.card, pub.cardFlush)}>
        <ul className={pub.evlist}>
          {events.map((e) => (
            <EventLinkRow key={e.id} event={e} summary={<ResultSummary event={e} />} />
          ))}
        </ul>
      </div>
    </div>
  );
}
