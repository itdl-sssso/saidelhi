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
import { FigureValue } from "@/ui/Figure";
import { QuoteCard } from "@/ui/QuoteCard";
import { SectionHeading } from "@/ui/SectionHeading";
import { CentreFinder } from "./CentreFinder";
import { ImageSlot } from "./ImageSlot";
import type { HomeStory } from "./stories";
import { OptInForm } from "@/features/join/OptInForm";
import { FACEBOOK_URL, SAICONNECT_URL, SAI_ANSWERS_URL, YOUTUBE_URL } from "@/features/shell/links";
import styles from "./HomeSections.module.css";

const WING_ICON: Record<Wing, IconName> = {
  service: "hand-heart",
  educational: "graduation-cap",
  spiritual: "music",
  mahila: "heart",
  youth: "sprout",
};

/** Only when there is no thought at all; otherwise the picture is part of the thought data. */
const FALLBACK_THOUGHT_PHOTO = "/images/values/photo-sathya.webp";

const KPI_ICON: Record<string, IconName> = {
  activities: "calendar-days",
  people_served: "users",
  "blood.units": "droplets",
  "eye.spectacles": "glasses",
};

export function HomeSections({
  data,
  centres,
  stories,
  discourses,
}: {
  data: HomePayload;
  centres: CentreListItem[];
  stories: HomeStory[];
  /** Feature flag `discourses`: the Answers section only links into /discourses when it is on. */
  discourses: boolean;
}) {
  // Order follows the design (Home v2): thought, upcoming, impact, find a centre, wings,
  // stories, centenary, news, answers, auditorium, get involved.
  return (
    <div id="home-flow" className={styles.flow}>
      <ThoughtSection thought={data.thought} />
      <UpcomingStrip events={data.upcoming} />
      {data.kpis ? <ImpactSnapshot kpis={data.kpis} /> : <ProgramsTeaser />}
      <CentreFinder centres={centres} />
      <Wings wings={data.wings} />
      <Stories stories={stories} />
      <Centenary articles={data.centenary} />
      <News articles={data.articles} />
      <Answers discourses={discourses} />
      <Auditorium />
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
            src={thought?.image?.url ?? FALLBACK_THOUGHT_PHOTO}
            alt={thought?.image ? tx(thought.image.alt, locale) : t("thoughtPhotoAlt")}
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
          <SectionHeading titleId="impact-title" eyebrow={t("impactEyebrow")} title={t("impactTitle")} description={t("impactLead", { range })} />
          <Button href="/impact" variant="outline" iconAfter="arrow-right">
            {t("seeImpact")}
          </Button>
        </div>
        <ul className={styles.kpis}>
          {kpis.map((k) => (
            <li key={k.key} className={styles.kpi}>
              <span className={styles.kpiIc} aria-hidden="true">
                <Icon name={KPI_ICON[k.key] ?? "hand-heart"} size={24} />
              </span>
              <b className={styles.kpiFig}>
                <FigureValue value={k.figure.value} />
              </b>
              <LocalText value={k.label} className={styles.kpiLabel} />
              {k.note ? <LocalText value={k.note} className={styles.kpiNote} /> : null}
            </li>
          ))}
        </ul>
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
  const tc = useTranslations("common");
  return (
    <section className={styles.sec} aria-labelledby="wings-title">
      <Wrap>
        <div className={styles.secHead}>
          <SectionHeading titleId="wings-title" eyebrow={t("wingsEyebrow")} title={t("wingsTitle")} description={t("wingsLead")} />
          <div className={styles.wingActs}>
            <Button href={SAICONNECT_URL} external variant="outline" icon="log-in">
              {t("saiConnectLogin")}
            </Button>
            <a className={styles.iconBtn} href={FACEBOOK_URL} target="_blank" rel="noopener noreferrer" aria-label={`Facebook (${tc("opensNewTab")})`}>
              <FacebookGlyph />
            </a>
            <a className={styles.iconBtn} href={YOUTUBE_URL} target="_blank" rel="noopener noreferrer" aria-label={`YouTube (${tc("opensNewTab")})`}>
              <YoutubeGlyph />
            </a>
          </div>
        </div>
        <ul className={styles.wings}>
          {wings.map((w) => (
            <li key={w.wing}>
              <Link href={w.href} className={styles.wing} data-wing={w.wing}>
                <span className={styles.wingIc} aria-hidden="true">
                  <Icon name={WING_ICON[w.wing]} size={24} />
                </span>
                <LocalText value={w.title} className={styles.wingTitle} />
                <span className={styles.wingGloss}>{t(`wingGloss.${w.wing}`)}</span>
                <LocalText value={w.summary} className={styles.wingBody} />
                <span className={styles.wingMore}>
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

// Brand glyphs (Feather, MIT): the icon set has no brand marks.
function FacebookGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}
function YoutubeGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" />
      <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" />
    </svg>
  );
}

function Stories({ stories }: { stories: HomeStory[] }) {
  const t = useTranslations("home");
  const locale = useLocale() as AppLocale;
  return (
    <section id="activities" className={cx(styles.sec, styles.warm)} aria-labelledby="stories-title">
      <Wrap>
        <div className={styles.secHead}>
          <SectionHeading titleId="stories-title" eyebrow={t("storiesEyebrow")} title={t("storiesTitle")} description={t("storiesLead")} />
          {stories.length ? (
            <Button href="/news" variant="outline" iconAfter="arrow-right">
              {t("seeAll")}
            </Button>
          ) : null}
        </div>
        {stories.length ? (
          <ul className={styles.stories}>
            {stories.map((s) => (
              <li key={s.href} className={styles.storyItem}>
                <Link href={s.href} className={styles.acard}>
                  <span className={styles.acardImg}>
                    {s.image ? (
                      <Image src={s.image.url} alt={tx(s.image.alt, locale)} fill sizes="(min-width: 900px) 30vw, 100vw" className={styles.cover} />
                    ) : (
                      <span className={styles.acardPh} aria-hidden="true">
                        <Icon name="hand-heart" size={24} />
                      </span>
                    )}
                  </span>
                  <span className={styles.acardBody}>
                    <span className={styles.acardTitle}>{tx(s.title, locale)}</span>
                    <span className={styles.acardSummary}>{tx(s.excerpt, locale)}</span>
                    <span className={styles.more}>
                      {t("readStory")}
                      <Icon name="arrow-right" size={16} />
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className={styles.emptyCard}>
            <EmptyState icon="hand-heart" title={t("storiesEmptyTitle")} body={t("storiesEmpty")} />
          </div>
        )}
      </Wrap>
    </section>
  );
}

function News({ articles }: { articles: Article[] }) {
  const t = useTranslations("home");
  if (!articles.length) return null;
  return (
    <section id="news" className={cx(styles.sec, styles.pt0)} aria-labelledby="news-title">
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
          <div className={styles.centArt}>
            {/* TODO(user): centenary artwork. Pass `src` (and `alt`) here when the image is supplied. */}
            <ImageSlot label={t("centenaryImageSlot")} icon="sparkles" />
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

function Answers({ discourses }: { discourses: boolean }) {
  const t = useTranslations("home");
  const tc = useTranslations("common");
  return (
    <section className={cx(styles.sec, styles.calm)} aria-labelledby="answers-title">
      <Wrap className={styles.split}>
        <div>
          <SectionHeading titleId="answers-title" eyebrow={t("answersEyebrow")} title={t("answersTitle")} description={t("answersBody")} />
          <div className={styles.acts}>
            {/* The discourse library stays hidden until the Trust grants permission (flag), so the link follows the flag. */}
            {discourses ? (
              <Button href="/discourses" icon="book-open" iconAfter="arrow-right">
                {t("answersDiscourses")}
              </Button>
            ) : null}
            <Button href={SAI_ANSWERS_URL} external variant={discourses ? "outline" : "secondary"} icon="video" iconAfter="external-link">
              {t("answersYoutube")}
            </Button>
          </div>
        </div>
        <a href={SAI_ANSWERS_URL} target="_blank" rel="noopener noreferrer" className={styles.video} aria-label={`${t("answersWatch")} (${tc("opensNewTab")})`}>
          {/* TODO(user): poster frame of a featured answer video; pass `src` to ImageSlot. */}
          <ImageSlot label={t("answersPoster")} icon="video" />
          <span className={styles.play} aria-hidden="true">
            <Icon name="play" size={24} />
          </span>
        </a>
      </Wrap>
    </section>
  );
}

function Auditorium() {
  const t = useTranslations("home");
  const facts: Array<[string, string]> = [
    ["520", t("audSeats")],
    ["371", t("audLower")],
    ["149", t("audUpper")],
  ];
  return (
    <section className={cx(styles.sec, styles.pt0)} aria-labelledby="aud-title">
      <Wrap className={styles.split}>
        <div className={styles.audImg}>
          {/* TODO(user): photograph of the International Centre; pass `src` to ImageSlot. */}
          <ImageSlot label={t("audImageSlot")} icon="building-2" />
        </div>
        <div>
          <SectionHeading titleId="aud-title" eyebrow={t("audEyebrow")} title={t("audTitle")} description={t("audBody")} />
          <dl className={styles.audFacts}>
            {facts.map(([n, l]) => (
              <div key={l}>
                <dt>{n}</dt>
                <dd>{l}</dd>
              </div>
            ))}
          </dl>
          <ul className={styles.factsList}>
            <li>
              <Icon name="phone" size={16} />
              <span>011-2436 3221 · 011-2436 0190</span>
            </li>
            <li>
              <Icon name="clock" size={16} />
              <span>{t("audHours")}</span>
            </li>
            <li>
              <Icon name="mail" size={16} />
              <a href="mailto:bookings.sssic@gmail.com">bookings.sssic@gmail.com</a>
            </li>
          </ul>
          <div className={styles.audCta}>
            <Button href="/about#contact" variant="outline" iconAfter="arrow-right">
              {t("audKnow")}
            </Button>
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
          <span className={styles.waIc} aria-hidden="true">
            <Icon name="message-circle" size={20} />
          </span>
          <h3 className={styles.h3}>{t("waTitle")}</h3>
          <p className={styles.small}>{t("waBody")}</p>
          <div className={styles.waForm}>
            <OptInForm compact districts={[]} sevaTypes={[]} submitLabel={t("waSubmit")} languageLabel={t("waLang")} />
          </div>
          <p className={styles.fine}>
            {t("waPrivacyShort")} <Link href="/privacy">{t("privacyLink")}</Link>
          </p>
        </div>
      </Wrap>
    </section>
  );
}
