import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import type { EventPublic, ValuePayload } from "@/contract";
import { Link } from "@/i18n/navigation";
import { type AppLocale, formatTime, istParts, monthName } from "@/lib/format";
import { VALUE_ICON, VALUE_KEYS, type ValueKey, valueEmblem, valuePhoto } from "@/features/home/values";
import { EnglishOnlyBar } from "@/features/public/p1";
import { LocalText, pub } from "@/features/public/parts";
import { Badge } from "@/ui/Badge";
import { Breadcrumb } from "@/ui/Breadcrumb";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { cx } from "@/ui/cx";
import { DharmaRule } from "@/ui/DharmaRule";
import { EventScheduleCard, type ScheduleEvent } from "@/ui/EventScheduleCard";
import { Eyebrow } from "@/ui/Eyebrow";
import { FigureValue } from "@/ui/Figure";
import { Icon, type IconName } from "@/ui/Icon";
import { QuoteCard } from "@/ui/QuoteCard";
import { SectionHeading } from "@/ui/SectionHeading";
import { PRACTICE_CTA, STRAND_ICONS } from "./model";
import styles from "./ValueView.module.css";

/** Hindi prose is agent-written (native review pending). Set false to fall back to English with a notice. */
const HI_PROSE_READY = true;

export function ValueView({ data }: { data: ValuePayload }) {
  const t = useTranslations("valuePage");
  const th = useTranslations("home");
  const tp = useTranslations("programs");
  const locale = useLocale() as AppLocale;
  const k = data.slug as ValueKey;
  const idx = VALUE_KEYS.indexOf(k);
  const name = th(`values.${k}.name`);
  const proseEnglish = locale === "hi" && !HI_PROSE_READY;
  const proseLang = proseEnglish ? "en" : undefined;
  const livedHref = data.lived.sevaType ? `/programs/${data.lived.sevaType}` : data.lived.wing ? `/programs?wing=${data.lived.wing}` : "/programs";
  const cta = PRACTICE_CTA[k];
  const attribution = (a: string) => (a === "Bhagawan Sri Sathya Sai Baba" ? t("attribution") : a);

  const scheduled: ScheduleEvent[] = data.upcoming.map((e: EventPublic) => {
    const p = istParts(e.startsAt);
    return {
      id: e.id,
      month: monthName(p.m, locale),
      day: String(p.d),
      dateTime: e.startsAt,
      name: <LocalText value={e.title} />,
      time: e.recurring ? `${formatTime(e.startsAt, locale)} · ${t("everyWeek")}` : formatTime(e.startsAt, locale),
      venue: e.venue.name,
      href: e.recurring ? `/centres/${e.centre?.slug ?? e.samithi.slug}` : `/events/${e.id}`,
    };
  });

  const strands = [1, 2, 3] as const;
  const teachings = [1, 2, 3] as const;

  return (
    <>
      {proseEnglish ? <EnglishOnlyBar text={t("englishOnly")} /> : null}
      <header className={styles.hero}>
        <div className={cx(pub.wrap, styles.heroGrid)}>
          <div className={styles.heroText}>
            <Breadcrumb
              className={styles.crumb}
              items={[
                { label: t("crumbHome"), href: "/" },
                { label: t("crumbValues"), href: "/#act2" },
                { label: name },
              ]}
            />
            <Image className={styles.emblem} src={valueEmblem(k)} alt="" width={88} height={88} />
            <Eyebrow>{th("valueOf", { n: idx + 1 })}</Eyebrow>
            <h1 className={styles.h1}>
              {name}
              {locale === "en" ? (
                <span className={styles.sanskrit} lang="sa">
                  {t(`${k}.sanskrit`)}
                </span>
              ) : null}
            </h1>
            <p className={styles.gloss}>{th(`values.${k}.gloss`)}</p>
            <blockquote className={styles.hq}>
              “{th(`values.${k}.quote`)}”<cite>{t("attribution")}</cite>
            </blockquote>
          </div>
          <figure className={styles.portrait}>
            <Image src={valuePhoto(k)} alt={t("portraitAlt")} fill sizes="(min-width: 900px) 40vw, 100vw" priority />
          </figure>
        </div>
      </header>

      <section className={styles.sec} lang={proseLang}>
        <div className={pub.wrap}>
          <div className={styles.intro}>
            <SectionHeading eyebrow={t("askEyebrow")} title={t(`${k}.introTitle`)} />
            <p className={styles.lead}>{t(`${k}.lead`)}</p>
          </div>
          <ol className={cx(styles.grid3, styles.strands)}>
            {strands.map((n, i) => (
              <li key={n}>
                <Card tone="plain" className={styles.fill}>
                  <div className={styles.strandN}>
                    <span className={styles.ico}>
                      <Icon name={STRAND_ICONS[k][i]} size={20} />
                    </span>
                    <span className={styles.num} aria-hidden="true">
                      {`0${n}`}
                    </span>
                  </div>
                  <h3 className={styles.h3}>{t(`${k}.s${n}t`)}</h3>
                  <p className={styles.body}>{t(`${k}.s${n}d`)}</p>
                </Card>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className={cx(styles.sec, styles.calm)}>
        <div className={cx(pub.wrap, styles.grid2)}>
          <div lang={proseLang}>
            <SectionHeading eyebrow={t("livedEyebrow")} title={t(`${k}.practiceTitle`)} />
            <p className={styles.body}>{t(`${k}.practiceBody`)}</p>
            {data.facts.length ? (
              <section aria-label={t("factsHeading")}>
                <dl className={styles.facts}>
                  {data.facts.map((f) => (
                    <div key={f.key}>
                      <dt>
                        <FigureValue value={f.figure.value} inline />
                      </dt>
                      <dd>
                        <LocalText value={f.label} />
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            ) : null}
            <Link href={livedHref} className={styles.lived}>
              <Card tone="plain" interactive>
                <div className={styles.livedRow}>
                  <span className={styles.ico}>
                    <Icon name={data.lived.sevaType ? VALUE_ICON[k] : ("layout-grid" as IconName)} size={20} />
                  </span>
                  <div className={styles.livedText}>
                    <Badge tone="shanti">{data.lived.wing ? tp("wingBadge", { wing: tp(`wing_${data.lived.wing}`) }) : t(`${k}.livedWing`)}</Badge>
                    <h3 className={styles.h4}>{t(`${k}.livedTitle`)}</h3>
                    <p>{t(`${k}.livedBody`)}</p>
                  </div>
                  <span className={styles.livedGo}>
                    {t(`${k}.livedButton`)}
                    <Icon name="arrow-right" size={16} />
                  </span>
                </div>
              </Card>
            </Link>
          </div>
          {scheduled.length ? (
            <EventScheduleCard
              title={t(`${k}.schedTitle`)}
              events={scheduled}
              footer={
                <Button href="/calendar" variant="ghost" size="sm" iconAfter="arrow-right">
                  {t(`${k}.schedAll`)}
                </Button>
              }
            />
          ) : (
            <div className={pub.card}>
              <h3 className={pub.h3}>{t(`${k}.schedTitle`)}</h3>
              <p className={pub.small}>{t("schedEmpty")}</p>
              <Button href="/calendar" variant="outline" size="sm" iconAfter="arrow-right">
                {t(`${k}.schedAll`)}
              </Button>
            </div>
          )}
        </div>
      </section>

      <section className={styles.sec} lang={proseLang}>
        <div className={pub.wrap}>
          <SectionHeading eyebrow={t("teachingsEyebrow")} title={t("teachingsTitle", { name })} align="center" />
          <ul className={cx(styles.grid3, styles.teach)}>
            {teachings.map((n) => (
              <li key={n}>
                <QuoteCard label={t(`${k}.t${n}l`)} quote={t(`${k}.t${n}q`)} attribution={attribution(t(`${k}.t${n}a`))} />
              </li>
            ))}
          </ul>
        </div>
      </section>

      {data.discourses !== null && data.discourses.length ? (
        <section className={cx(styles.sec, styles.pt0)}>
          <div className={pub.wrap}>
            <SectionHeading eyebrow={t("discEyebrow")} title={t("discTitle", { name })} />
            <ul className={cx(styles.grid3, styles.teach)}>
              {data.discourses.map((d) => (
                <li key={d.slug}>
                  <Link href={`/discourses/${d.slug}`} className={styles.disc}>
                    <span className={styles.ico}>
                      <Icon name="book-open" size={20} />
                    </span>
                    <LocalText value={d.title} className={styles.discTitle} />
                    <span className={pub.cap}>
                      {d.place} · {d.date}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      <section className={cx(styles.sec, styles.pt0)}>
        <div className={pub.wrap}>
          <Card tone="warm" capped>
            <div className={cx(styles.grid2, styles.ctaGrid)}>
              <div lang={proseLang}>
                <Eyebrow>{t("beginHere")}</Eyebrow>
                <h2 className={styles.ctaH}>{t(`${k}.ctaTitle`)}</h2>
                <p className={styles.body}>{t(`${k}.ctaBody`)}</p>
              </div>
              <div className={styles.ctaActs}>
                <Button href={cta.href} size="lg" icon={cta.icon}>
                  {t(`${k}.ctaButton`)}
                </Button>
                <Button href="/centres/map" variant="outline" size="lg" icon="map-pin">
                  {t("findCentre")}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </section>

      <nav className={styles.values} aria-label={t("fiveValues")}>
        <div className={pub.wrap}>
          <ul className={styles.vrow}>
            {VALUE_KEYS.map((x) => (
              <li key={x}>
                <Link href={`/values/${x}`} className={cx(styles.vlink, x === k && styles.on)} aria-current={x === k ? "page" : undefined}>
                  <Image src={valueEmblem(x)} alt="" width={56} height={56} />
                  <span className={styles.vn}>{th(`values.${x}.name`)}</span>
                  <span className={styles.vg}>{th(`values.${x}.gloss`)}</span>
                </Link>
              </li>
            ))}
          </ul>
          <div className={styles.pager}>
            <Link href={`/values/${data.prev}`} rel="prev">
              <Icon name="arrow-left" size={16} />
              {th(`values.${data.prev}.name`)} · {th(`values.${data.prev}.gloss`)}
            </Link>
            <Link href={`/values/${data.next}`} rel="next">
              {th(`values.${data.next}.name`)} · {th(`values.${data.next}.gloss`)}
              <Icon name="arrow-right" size={16} />
            </Link>
          </div>
        </div>
      </nav>
      <DharmaRule height={2} />
    </>
  );
}
