import type { ReactNode } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import type { Article, CentreListItem, EventPublic, HomePayload, KpiTile as KpiTileDto, Thought, WingCard, Wing } from "@/contract";
import { Link } from "@/i18n/navigation";
import {
  type AppLocale,
  formatDate,
  formatIsoDate,
  formatPeriodRange,
  formatTime,
  istParts,
  monthName,
  pickText,
  tx,
  weekdayName,
} from "@/lib/format";
import { LocalText } from "@/features/public/parts";
import { SEVA_ICON, volunteersStillNeeded } from "@/features/public/seva";
import { Button } from "@/ui/Button";
import { cx } from "@/ui/cx";
import { EmptyState } from "@/ui/EmptyState";
import { Eyebrow } from "@/ui/Eyebrow";
import { Icon, type IconName } from "@/ui/Icon";
import { KpiTile } from "@/ui/KpiTile";
import { QuoteCard } from "@/ui/QuoteCard";
import { SectionHeading } from "@/ui/SectionHeading";
import { CentreFinder } from "./CentreFinder";
import styles from "./HomeSections.module.css";

const WING_ICON: Record<Wing, IconName> = {
  service: "hand-heart",
  educational: "graduation-cap",
  spiritual: "music",
  mahila: "heart",
  youth: "sprout",
};

const KPI_ICON: Record<string, IconName> = {
  activities: "calendar-days",
  people_served: "users",
  "blood.units": "droplets",
  "eye.spectacles": "glasses",
};

export function HomeSections({ data, centres }: { data: HomePayload; centres: CentreListItem[] }) {
  return (
    <div className={styles.flow}>
      <ThoughtSection thought={data.thought} />
      <UpcomingStrip events={data.upcoming} />
      {data.kpis ? <ImpactSnapshot kpis={data.kpis} /> : <ProgramsTeaser />}
      <Wings wings={data.wings} />
      <News articles={data.articles} />
      <Centenary articles={data.centenary} />
      <CentreFinder centres={centres} />
      <GetInvolved />
    </div>
  );
}

function Wrap({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx(styles.wrap, className)}>{children}</div>;
}

function ThoughtSection({ thought }: { thought: Thought | null }) {
  const t = useTranslations("home");
  const locale = useLocale() as AppLocale;
  return (
    <section className={styles.sec} aria-labelledby="thought-label">
      <Wrap className={styles.thoughtGrid}>
        <div className={styles.thought}>
          <h2 id="thought-label" className="sr-only">
            {t("thoughtLabel")}
          </h2>
          <QuoteCard
            label={t("thoughtLabel")}
            date={thought ? formatIsoDate(thought.date, locale) : undefined}
            dateTime={thought?.date}
            quote={thought ? <LocalText value={thought.text} /> : t("thought")}
            attribution={thought?.source ? <LocalText value={thought.source} /> : t("attribution")}
          />
        </div>
        <div className={styles.thoughtPhoto}>
          <Image
            src="/images/values/photo-sathya.webp"
            alt={t("thoughtPhotoAlt")}
            fill
            sizes="(min-width: 900px) 45vw, 100vw"
            className={styles.cover}
          />
        </div>
      </Wrap>
    </section>
  );
}

function UpcomingStrip({ events }: { events: EventPublic[] }) {
  const t = useTranslations("home");
  return (
    <section id="seva" className={cx(styles.sec, styles.calm)} aria-labelledby="upcoming-title">
      <Wrap>
        <div className={styles.secHead}>
          <SectionHeading
            titleId="upcoming-title"
            eyebrow={t("upcomingEyebrow")}
            title={t("upcomingTitle")}
            description={t("upcomingLead")}
          />
          <Button href="/calendar" variant="outline" icon="calendar-days" iconAfter="arrow-right">
            {t("allUpcoming")}
          </Button>
        </div>
        {events.length ? (
          <>
            <ul className={styles.strip} aria-label={t("upcomingList")}>
              {events.map((e) => (
                <UpcomingCard key={e.id} event={e} />
              ))}
            </ul>
            {events.length > 1 ? <p className={styles.swipe}>{t("swipe")}</p> : null}
          </>
        ) : (
          <div className={styles.emptyCard}>
            <EmptyState
              icon="calendar-days"
              title={t("noUpcomingTitle")}
              body={t("noUpcoming")}
              action={
                <Button href="/calendar" variant="outline" iconAfter="arrow-right">
                  {t("seeCalendar")}
                </Button>
              }
            />
          </div>
        )}
      </Wrap>
    </section>
  );
}

function UpcomingCard({ event }: { event: EventPublic }) {
  const t = useTranslations("home");
  const ts = useTranslations("seva");
  const locale = useLocale() as AppLocale;
  const p = istParts(event.startsAt);
  const needed = volunteersStillNeeded(event);
  return (
    <li className={styles.evItem}>
      <Link href={`/events/${event.id}`} className={styles.ev}>
        <span className={styles.evTop}>
          <span className={styles.dchip}>
            <b>{p.d}</b>
            <span>{monthName(p.m, locale)}</span>
          </span>
          <span className={styles.evIc} aria-hidden="true">
            <Icon name={SEVA_ICON[event.sevaType]} size={20} />
          </span>
        </span>
        <span className="sr-only">{`${weekdayName(p.dow, locale)}, ${formatDate(event.startsAt, locale)}. `}</span>
        <LocalText value={event.title} className={styles.evTitle} />
        <span className={styles.evGloss}>{ts(event.sevaType)}</span>
        <span className={styles.evMeta}>
          <span>
            <Icon name="clock" size={16} />
            {formatTime(event.startsAt, locale)}
          </span>
          <span>
            <Icon name="map-pin" size={16} />
            {tx(event.samithi.name, locale)} · {tx(event.district.name, locale)}
          </span>
        </span>
        {needed !== null ? (
          <span className={styles.vol}>
            <Icon name="hand-heart" size={16} />
            {t("volunteersNeeded", { count: needed })}
          </span>
        ) : (
          <span className={styles.open}>{t("openToAll")}</span>
        )}
      </Link>
    </li>
  );
}

function ImpactSnapshot({ kpis }: { kpis: KpiTileDto[] }) {
  const t = useTranslations("home");
  const locale = useLocale() as AppLocale;
  const period = kpis[0].period;
  const range = formatPeriodRange(period.from, period.to, locale, (to) => t("upTo", { date: to }));
  return (
    <section className={styles.sec} aria-labelledby="impact-title">
      <Wrap>
        <div className={styles.secHead}>
          <SectionHeading
            titleId="impact-title"
            eyebrow={t("impactEyebrow")}
            title={t("impactTitle", { period: tx(period.label, locale) })}
            description={t("impactLead", { range })}
          />
          <Button href="/impact" variant="outline" iconAfter="arrow-right">
            {t("seeImpact")}
          </Button>
        </div>
        <div className={styles.kpis}>
          {kpis.map((k) => (
            <KpiTile
              key={k.key}
              label={<LocalText value={k.label} />}
              figure={k.figure}
              icon={KPI_ICON[k.key]}
              period={t("approvedFigures")}
              note={k.note ? <LocalText value={k.note} /> : undefined}
            />
          ))}
        </div>
      </Wrap>
    </section>
  );
}

function ProgramsTeaser() {
  const t = useTranslations("home");
  return (
    <section className={styles.sec} aria-labelledby="programs-title">
      <Wrap>
        <div className={styles.teaser}>
          <SectionHeading titleId="programs-title" eyebrow={t("programsEyebrow")} title={t("programsTitle")} description={t("programsLead")} />
          <Button href="/programs" variant="outline" iconAfter="arrow-right">
            {t("seePrograms")}
          </Button>
        </div>
      </Wrap>
    </section>
  );
}

function Wings({ wings }: { wings: WingCard[] }) {
  const t = useTranslations("home");
  return (
    <section className={styles.sec} aria-labelledby="wings-title">
      <Wrap>
        <div className={styles.secHead}>
          <SectionHeading titleId="wings-title" eyebrow={t("wingsEyebrow")} title={t("wingsTitle")} description={t("wingsLead")} />
          <Button href="/programs" variant="outline" iconAfter="arrow-right">
            {t("allPrograms")}
          </Button>
        </div>
        <ul className={styles.wings}>
          {wings.map((w) => (
            <li key={w.wing}>
              <Link href={w.href} className={styles.wing}>
                <span className={styles.wingIc} aria-hidden="true">
                  <Icon name={WING_ICON[w.wing]} size={20} />
                </span>
                <LocalText value={w.title} className={styles.wingTitle} />
                <LocalText value={w.summary} className={styles.wingBody} />
                <span className={styles.more}>
                  {t("explore")}
                  <Icon name="arrow-right" size={16} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Wrap>
    </section>
  );
}

function News({ articles }: { articles: Article[] }) {
  const t = useTranslations("home");
  if (!articles.length) return null;
  return (
    <section id="news" className={cx(styles.sec, styles.warm)} aria-labelledby="news-title">
      <Wrap>
        <div className={styles.secHead}>
          <SectionHeading titleId="news-title" eyebrow={t("newsEyebrow")} title={t("newsTitle")} />
          <Button href="/news" variant="outline" iconAfter="arrow-right">
            {t("seeAll")}
          </Button>
        </div>
        <ul className={styles.news}>
          {articles.map((a, i) => (
            <ArticleCard key={a.slug} article={a} lead={i === 0} />
          ))}
        </ul>
      </Wrap>
    </section>
  );
}

function ArticleCard({ article, lead }: { article: Article; lead: boolean }) {
  const t = useTranslations("home");
  const tc = useTranslations("articleCategory");
  const locale = useLocale() as AppLocale;
  return (
    <li className={cx(styles.newsItem, lead && styles.newsLead)}>
      <Link href={`/news/${article.slug}`} className={styles.acard}>
        <span className={styles.acardImg}>
          {article.cover ? (
            <Image
              src={article.cover.url}
              alt={pickText(article.cover.alt, locale).text}
              fill
              sizes={lead ? "(min-width: 900px) 55vw, 100vw" : "(min-width: 900px) 40vw, 100vw"}
              className={styles.cover}
            />
          ) : (
            <span className={styles.acardPh} aria-hidden="true">
              <Icon name="newspaper" size={24} />
            </span>
          )}
        </span>
        <span className={styles.acardBody}>
          <span className={styles.acardMeta}>
            <span className={styles.cat}>{tc(article.category)}</span>
            <time dateTime={article.publishedAt}>{formatDate(article.publishedAt, locale)}</time>
          </span>
          <LocalText value={article.title} className={styles.acardTitle} />
          <LocalText value={article.summary} className={styles.acardSummary} />
          <span className={styles.acardFoot}>
            <span>
              <Icon name="clock" size={16} />
              {t("readingMinutes", { count: article.readingMinutes })}
            </span>
            <span className={styles.more}>
              {t("read")}
              <Icon name="arrow-right" size={16} />
            </span>
          </span>
        </span>
      </Link>
    </li>
  );
}

function Centenary({ articles }: { articles: Article[] }) {
  const t = useTranslations("home");
  return (
    <section className={styles.sec} aria-labelledby="centenary-title">
      <Wrap>
        <div className={styles.cent}>
          <div className={styles.centArt} aria-hidden="true">
            <Image src="/images/values/value-prema.webp" alt="" width={200} height={200} />
            <span className={styles.centNum}>100</span>
          </div>
          <div className={styles.centCopy}>
            <Eyebrow>{t("centenaryEyebrow")}</Eyebrow>
            <h2 id="centenary-title" className={styles.h2}>
              {t("centenaryTitle")}
            </h2>
            <p className={styles.body}>{t("centenaryBody")}</p>
            {articles.length ? (
              <ul className={styles.chips} aria-label={t("centenaryChips")}>
                {articles.slice(0, 4).map((a) => (
                  <li key={a.slug}>
                    <Link href={`/news/${a.slug}`} className={styles.chip}>
                      <LocalText value={a.title} />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
            <div>
              <Button href="/news?c=centenary" iconAfter="arrow-right">
                {t("centenaryAll")}
              </Button>
            </div>
          </div>
        </div>
      </Wrap>
    </section>
  );
}

function GetInvolved() {
  const t = useTranslations("home");
  return (
    <section id="involve" className={styles.sec} aria-labelledby="involve-title">
      <Wrap className={styles.involve}>
        <div className={cx(styles.involveCard, styles.involveWarm)}>
          <Eyebrow>{t("involveEyebrow")}</Eyebrow>
          <h2 id="involve-title" className={styles.h2}>
            {t("involveTitle")}
          </h2>
          <p className={styles.body}>{t("involveBody")}</p>
          <div>
            <Button href="/join" size="lg" icon="hand-heart">
              {t("joinSeva")}
            </Button>
          </div>
        </div>
        <div className={cx(styles.involveCard, styles.involveCalm)}>
          <span className={styles.wingIc} aria-hidden="true">
            <Icon name="message-circle" size={20} />
          </span>
          <h3 className={styles.h3}>{t("waTitle")}</h3>
          <p className={styles.small}>{t("waBody")}</p>
          <ul className={styles.waSteps}>
            <li>{t("waStep1")}</li>
            <li>{t("waStep2")}</li>
            <li>{t("waStep3")}</li>
          </ul>
          <p className={styles.fine}>
            {t("waPrivacy")}{" "}
            <Link href="/privacy">{t("privacyLink")}</Link>
          </p>
        </div>
      </Wrap>
    </section>
  );
}
