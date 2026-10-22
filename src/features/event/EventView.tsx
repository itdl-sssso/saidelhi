import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import type { EventPublic, EventResults } from "@/contract";
import { Link } from "@/i18n/navigation";
import {
  type AppLocale,
  durationMinutes,
  formatDate,
  formatDateLong,
  formatTimeRange,
  mapsUrl,
  pickText,
} from "@/lib/format";
import {
  ExternalLink,
  LocalText,
  PageHero,
  SectionHead,
  pub,
} from "@/features/public/parts";
import { SEVA_ICON, volunteersStillNeeded } from "@/features/public/seva";
import { Badge } from "@/ui/Badge";
import { Button } from "@/ui/Button";
import { BarChart } from "@/ui/Charts";
import { cx } from "@/ui/cx";
import { EstimateBadge, FigureValue } from "@/ui/Figure";
import { Icon } from "@/ui/Icon";
import { StatusPill } from "@/ui/StatusPill";
import styles from "./EventView.module.css";

export function EventView({ event }: { event: EventPublic }) {
  const t = useTranslations("event");
  const ts = useTranslations("seva");
  const locale = useLocale() as AppLocale;
  const title = pickText(event.title, locale);
  const cancelled = event.status === "cancelled";
  const when = formatDateLong(event.startsAt, locale);
  const time = formatTimeRange(event.startsAt, event.endsAt, locale);

  return (
    <>
      <PageHero
        crumbs={[
          { label: t("crumbHome"), href: "/" },
          { label: t("crumbCalendar"), href: "/calendar" },
          { label: <span lang={title.fallback ? "en" : undefined}>{title.text}</span> },
        ]}
      >
        <div className={pub.row}>
          <Badge tone="shanti" icon={SEVA_ICON[event.sevaType]}>
            {ts(event.sevaType)}
          </Badge>
          <StatusPill status={event.status} />
          {event.recurring ? (
            <Badge tone="neutral" icon="repeat">
              {t("everyWeek")}
            </Badge>
          ) : null}
        </div>
        <h1 className={cx(pub.h1, cancelled && pub.strike)} lang={title.fallback ? "en" : undefined}>
          {title.text}
        </h1>
        <p className={pub.lead}>
          {cancelled ? <del>{when}</del> : <time dateTime={event.startsAt}>{when}</time>}
          {" · "}
          {time}
          <Duration event={event} />
        </p>
      </PageHero>

      <section className={pub.section} style={{ paddingTop: "var(--space-4)" }}>
        <div className={cx(pub.wrap, pub.stack)}>
          <StateBanner event={event} />
          {event.status === "approved" && event.results ? (
            <After event={event} results={event.results} />
          ) : (
            <Before event={event} />
          )}
        </div>
      </section>
    </>
  );
}

function Duration({ event }: { event: EventPublic }) {
  const t = useTranslations("event");
  const mins = durationMinutes(event.startsAt, event.endsAt);
  if (mins === null) return null;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const label = h && m ? t("durationHm", { h, m }) : h ? t("durationH", { count: h }) : t("durationM", { count: m });
  return <span className={styles.duration}> ({label})</span>;
}

function StateBanner({ event }: { event: EventPublic }) {
  const t = useTranslations("event");
  const locale = useLocale() as AppLocale;
  switch (event.status) {
    case "awaiting_report":
    case "report_submitted":
      return (
        <div className={cx(pub.banner, pub.bannerYellow)} role="status">
          <Icon name="hourglass" size={20} />
          <span>
            <b>{t("awaitingTitle")}</b>
            {t("awaitingBody")}
          </span>
        </div>
      );
    case "cancelled":
      return (
        <div className={styles.bannerWrap}>
          <div className={cx(pub.banner, pub.bannerSlate)} role="status">
            <Icon name="circle-x" size={20} />
            <span>
              <b>{t("cancelledTitle")}</b>
              {t("cancelledBody")}
            </span>
          </div>
          <Button href="/calendar" variant="outline" iconAfter="arrow-right">
            {t("seeCalendar")}
          </Button>
        </div>
      );
    case "postponed":
      return (
        <div className={cx(pub.banner, pub.bannerSlate)} role="status">
          <Icon name="calendar-clock" size={20} />
          <span>
            <b>{t("postponedTitle")}</b>
            {event.postponedTo
              ? t("postponedTo", {
                  date: formatDateLong(event.postponedTo, locale),
                  time: formatTimeRange(event.postponedTo, null, locale),
                })
              : t("postponedBody")}
          </span>
        </div>
      );
    default:
      return null;
  }
}

function Before({ event }: { event: EventPublic }) {
  const t = useTranslations("event");
  const hasDescription = event.description.en.trim() !== "" || !!event.description.hi?.trim();

  const about = (
    <div className={styles.main}>
      {hasDescription ? (
        <div className={styles.prose}>
          <h2 className={pub.h3}>{t("aboutHeading")}</h2>
          <LocalText value={event.description} as="p" />
        </div>
      ) : null}
      {event.bring.length ? (
        <div className={pub.col} style={{ gap: 14 }}>
          <h2 className={pub.h3}>{t("bringHeading")}</h2>
          <ul className={styles.ul}>
            {event.bring.map((b, i) => (
              <li key={i}>
                <Icon name="check" size={18} />
                <LocalText value={b} />
              </li>
            ))}
          </ul>
          <p className={pub.cap}>{t("noId")}</p>
        </div>
      ) : null}
      {event.partner ? <PartnerCard name={event.partner.name} /> : null}
    </div>
  );

  return (
    <div className={styles.layout}>
      <div className={styles.side}>
        <div className={cx(pub.card, styles.metaCard)}>
          <Meta event={event} />
        </div>
        <JoinCard event={event} />
      </div>
      {about}
    </div>
  );
}

function PartnerCard({ name }: { name: string }) {
  const t = useTranslations("event");
  return (
    <div className={cx(pub.card, styles.partner)}>
      <span className={pub.icwell}>
        <Icon name="handshake" size={20} />
      </span>
      <span className={pub.small}>
        <b className={styles.strong}>{t("withPartner", { name })}</b>
        <br />
        {t("partnerNote")}
      </span>
    </div>
  );
}

function JoinCard({ event }: { event: EventPublic }) {
  const t = useTranslations("event");
  const needed = volunteersStillNeeded(event);
  if (needed === null) return null;
  return (
    <div className={styles.join}>
      <span className={styles.joinN}>{t("volunteersNeeded", { count: needed })}</span>
      <span className={pub.small}>{t("joinNote")}</span>
      {event.publicLinkUrl ? (
        <Button href={event.publicLinkUrl} icon="hand-heart" fullWidth>
          {t("joinCta")}
        </Button>
      ) : event.centreContact ? (
        <p className={pub.small}>{t("joinByPhone", { phone: event.centreContact })}</p>
      ) : null}
    </div>
  );
}

function Meta({ event }: { event: EventPublic }) {
  const t = useTranslations("event");
  const locale = useLocale() as AppLocale;
  const cancelled = event.status === "cancelled";
  return (
    <dl className={styles.meta}>
      <div>
        <dt>
          <Icon name="calendar-days" size={18} />
          <span className="sr-only">{t("metaWhen")}</span>
        </dt>
        <dd>
          <b>{cancelled ? <del>{formatDateLong(event.startsAt, locale)}</del> : formatDateLong(event.startsAt, locale)}</b>
          {formatTimeRange(event.startsAt, event.endsAt, locale)}
        </dd>
      </div>
      <div>
        <dt>
          <Icon name="map-pin" size={18} />
          <span className="sr-only">{t("metaWhere")}</span>
        </dt>
        <dd>
          {/* Venue names are user-entered: shown as entered, not translated. */}
          <b>{event.venue.name}</b>
          {event.venue.address}
          <span className={styles.mlinks}>
            <ExternalLink href={mapsUrl(event.venue)}>{t("googleMaps")}</ExternalLink>
            <Link href="/centres/map">
              <Icon name="map" size={16} />
              {t("seeOnMap")}
            </Link>
          </span>
        </dd>
      </div>
      <div>
        <dt>
          <Icon name="house" size={18} />
          <span className="sr-only">{t("metaOrganiser")}</span>
        </dt>
        <dd>
          <b>
            <Link href={`/centres/${event.samithi.slug}`}>
              <LocalText value={event.samithi.name} />
            </Link>
          </b>
          <Link href={`/districts/${event.district.slug}`}>
            {t("districtName", { name: pickText(event.district.name, locale).text })}
          </Link>
        </dd>
      </div>
      {event.centreContact ? (
        <div>
          <dt>
            <Icon name="phone" size={18} />
            <span className="sr-only">{t("metaContact")}</span>
          </dt>
          <dd>
            <b>
              <a href={`tel:${event.centreContact.replace(/[^+\d]/g, "")}`}>{event.centreContact}</a>
            </b>
            {t("centreContactNote")}
          </dd>
        </div>
      ) : null}
    </dl>
  );
}

function After({ event, results }: { event: EventPublic; results: EventResults }) {
  const t = useTranslations("event");
  const locale = useLocale() as AppLocale;
  const servedKeys = new Set(["eye.screened", "medical.patients", "narayan.meals", "narayan.ration_kits"]);
  const showServedNote = results.tiles.some((r) => servedKeys.has(r.key));

  return (
    <>
      <div className={pub.col} style={{ gap: "var(--space-3)" }}>
        <h2 className="sr-only">{t("resultsHeading")}</h2>
        <ul className={styles.results}>
          {results.tiles.map((tile) => (
            <li key={tile.key} className={styles.res}>
              <b>
                <FigureValue value={tile.figure.value} />
              </b>
              <LocalText value={tile.label} />
              {tile.figure.estimate && tile.figure.value !== null ? <EstimateBadge /> : null}
            </li>
          ))}
        </ul>
        <p className={pub.cap}>
          {t("approvedCaption", { date: formatDate(event.startsAt, locale) })}
          {showServedNote ? ` ${t("servedNote")}` : null}
        </p>
      </div>

      {results.breakdowns.length || results.followUp ? (
        <div className={styles.charts}>
          {results.breakdowns.map((b) => {
            const label = pickText(b.label, locale).text;
            return (
              <div key={b.key} className={pub.card}>
                <h2 className={pub.h3}>{label}</h2>
                <BarChart title={label} data={b.bars.map((bar) => ({ label: bar.label, figure: bar.figure }))} height={180} />
              </div>
            );
          })}
          {results.followUp ? <FollowUp followUp={results.followUp} partner={event.partner?.name ?? null} /> : null}
        </div>
      ) : null}

      {results.photos.length ? (
        <div className={pub.col} style={{ gap: 14 }}>
          <h2 className={pub.h3}>{t("photosHeading")}</h2>
          <div className={pub.photos}>
            {results.photos.map((p) => (
              <figure key={p.url} className={pub.photo}>
                <Image src={p.url} alt={pickText(p.alt, locale).text} fill sizes="(min-width: 768px) 25vw, 50vw" />
              </figure>
            ))}
          </div>
        </div>
      ) : null}

      {event.articleSlug ? (
        <div className={cx(pub.card, styles.report)}>
          <span className={pub.col} style={{ gap: 2 }}>
            <span className={styles.eyebrow}>{t("reportEyebrow")}</span>
            <span className={styles.reportTitle}>{t("reportTitle")}</span>
          </span>
          <Button href={`/news/${event.articleSlug}`} variant="secondary" iconAfter="arrow-right">
            {t("readReport")}
          </Button>
        </div>
      ) : null}

      <div>
        <SectionHead title={t("detailsHeading")} level={3} />
        <div className={cx(pub.card, styles.metaCard)}>
          <Meta event={event} />
        </div>
      </div>
    </>
  );
}

function FollowUp({ followUp, partner }: { followUp: NonNullable<EventResults["followUp"]>; partner: string | null }) {
  const t = useTranslations("event");
  const locale = useLocale() as AppLocale;
  const label = pickText(followUp.label, locale).text;
  const pct = followUp.done === null || followUp.of === 0 ? 0 : Math.min(100, (followUp.done / followUp.of) * 100);
  return (
    <div className={pub.card}>
      <h2 className={pub.h3}>{label}</h2>
      <span className={styles.follow}>
        {followUp.done === null
          ? t("followUpPending", { of: followUp.of })
          : t("followUpSoFar", { done: followUp.done, of: followUp.of })}
      </span>
      <div
        className={styles.prog}
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={followUp.of}
        aria-valuenow={followUp.done ?? 0}
      >
        <i style={{ width: `${pct}%` }} />
      </div>
      <span className={pub.small}>{partner ? t("followUpNotePartner", { partner }) : t("followUpNote")}</span>
    </div>
  );
}
