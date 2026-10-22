import { useLocale, useTranslations } from "next-intl";
import type { ImpactPayload, ImpactPeriod, SevaTypeImpact } from "@/contract";
import { Link } from "@/i18n/navigation";
import { type AppLocale, formatPeriodRange, monthName, tx } from "@/lib/format";
import { EventLinkRow, LocalText, PageHero, ResultSummary, SectionHead, pub } from "@/features/public/parts";
import { SEVA_ICON } from "@/features/public/seva";
import { LineChart } from "@/ui/Charts";
import { cx } from "@/ui/cx";
import { EmptyState } from "@/ui/EmptyState";
import { EstimateBadge, FigureValue } from "@/ui/Figure";
import { Icon, type IconName, icons } from "@/ui/Icon";
import { KpiTile } from "@/ui/KpiTile";
import { DistrictFilter } from "./DistrictFilter";
import { DistrictMap, DistrictRanking } from "./DistrictMap";
import styles from "./ImpactView.module.css";

const PERIODS: ImpactPeriod[] = ["this_year", "last_year", "all"];

const TILE_ICON: Record<string, IconName> = {
  activities: "calendar-days",
  people_served: "users",
  volunteer_hours: "hand-heart",
  active: "map",
};

const isIcon = (s: string): s is IconName => s in icons;

export function ImpactView({ data }: { data: ImpactPayload }) {
  const t = useTranslations("impact");
  const locale = useLocale() as AppLocale;
  const periodLabel = tx(data.period.label, locale);
  const range = formatPeriodRange(data.period.from, data.period.to, locale, (to) => t("upTo", { date: to }));
  const districtSlug = data.district?.slug ?? "";
  const districtName = data.district ? tx(data.district.name, locale) : null;
  const hasData =
    data.recent.length > 0 ||
    data.tiles.some((k) => k.figure.value !== null && k.figure.value !== 0) ||
    data.trend.some((p) => p.figure.value !== null && p.figure.value !== 0);
  const peopleNote = data.tiles.find((k) => k.note && k.key === "people_served")?.note;

  return (
    <>
      <PageHero>
        <p className={styles.eyebrow}>{t("eyebrow", { period: periodLabel })}</p>
        <h1 className={pub.h1}>{districtName ? t("titleDistrict", { district: districtName }) : t("title")}</h1>
        <p className={pub.lead}>{t("lead")}</p>
        <div className={styles.filters}>
          <nav className={pub.seg} aria-label={t("periodLabel")}>
            {PERIODS.map((p) => (
              <Link
                key={p}
                href={{ pathname: "/impact", query: districtSlug ? { period: p, district: districtSlug } : { period: p } }}
                aria-current={p === data.period.key ? "true" : undefined}
                scroll={false}
              >
                {t(`period_${p}`)}
              </Link>
            ))}
          </nav>
          <DistrictFilter
            period={data.period.key}
            value={districtSlug}
            options={data.byDistrict.map((d) => ({ value: d.district.slug, label: tx(d.district.name, locale) }))}
          />
        </div>
        <p className={cx(pub.cap, styles.approved)}>
          <Icon name="badge-check" size={16} />
          {t("caption")}
        </p>
      </PageHero>

      <section className={pub.section} style={{ paddingTop: "var(--space-4)" }}>
        <div className={cx(pub.wrap, pub.stack)}>
          {!hasData ? (
            <div className={pub.card}>
              <EmptyState
                icon="chart-column"
                headingLevel={2}
                title={t("emptyTitle")}
                body={t("emptyBody", { period: range })}
              />
            </div>
          ) : null}

          <div>
            <h2 className="sr-only">{t("headlineHeading", { period: range })}</h2>
            <div className={styles.kpis}>
              {data.tiles.map((k) => (
                <KpiTile
                  key={k.key}
                  label={<LocalText value={k.label} />}
                  figure={k.figure}
                  period={range}
                  icon={TILE_ICON[k.key]}
                  note={k.note && k.key !== "people_served" ? <LocalText value={k.note} /> : undefined}
                />
              ))}
            </div>
            {peopleNote ? (
              <p className={pub.cap} style={{ marginTop: 10 }}>
                <LocalText value={peopleNote} />
              </p>
            ) : null}
          </div>

          <div>
            <SectionHead title={t("bySevaHeading")} sub={t("bySevaSub", { period: range })} />
            <ul className={styles.programs}>
              {data.bySevaType.map((s) => (
                <SevaTypeCard key={s.sevaType} item={s} />
              ))}
            </ul>
          </div>

          <div>
            <SectionHead title={t("byDistrictHeading")} sub={t("byDistrictSub", { period: range })} />
            <div className={styles.mapLayout}>
              <div className={cx(pub.card, styles.mapCard)}>
                <DistrictMap districts={data.byDistrict} periodLabel={range} />
              </div>
              <div className={pub.card}>
                <p className={cx(pub.cap, styles.listTitle)}>{t("asList")}</p>
                <DistrictRanking districts={data.byDistrict} caption={t("byDistrictHeading")} />
              </div>
            </div>
          </div>

          <div className={styles.split}>
            <div>
              <SectionHead title={t("trendHeading")} sub={t("trendSub")} />
              <div className={pub.card}>
                <LineChart
                  title={t("trendHeading")}
                  height={220}
                  data={data.trend.map((p) => {
                    const [y, m] = p.month.split("-").map(Number);
                    return { label: m === 1 ? `${monthName(m, locale)} ${String(y).slice(2)}` : monthName(m, locale), figure: p.figure };
                  })}
                />
                {data.trend.some((p) => p.figure.estimate) ? (
                  <p className={pub.cap}>
                    <LocalText value={data.estimateNote} />
                  </p>
                ) : null}
              </div>
            </div>
            <div>
              <SectionHead
                title={t("recentHeading")}
                action={
                  <Link href="/calendar" className={pub.more}>
                    {t("calendarLink")}
                    <Icon name="arrow-right" size={16} />
                  </Link>
                }
              />
              {data.recent.length ? (
                <div className={cx(pub.card, pub.cardFlush)}>
                  <ul className={pub.evlist}>
                    {data.recent.map((e) => (
                      <EventLinkRow
                        key={e.id}
                        event={e}
                        summary={
                          <span className={pub.small}>
                            <ResultSummary event={e} />
                            {e.results?.tiles.some((x) => x.figure.value !== null) ? " · " : null}
                            {t("districtName", { name: tx(e.district.name, locale) })}
                          </span>
                        }
                      />
                    ))}
                  </ul>
                </div>
              ) : (
                <p className={pub.small}>{t("noRecent")}</p>
              )}
            </div>
          </div>

          <details className={pub.details}>
            <summary>
              <span className={styles.summary}>
                <Icon name="info" size={18} />
                {t("methodHeading")}
              </span>
              <Icon name="chevron-down" size={18} />
            </summary>
            <div className={pub.detailsBody}>
              <LocalText value={data.methodNote} as="p" />
              <ul>
                <li>{t("method1")}</li>
                <li>{t("method2")}</li>
                <li>{t("method3")}</li>
                <li>{t("method4")}</li>
              </ul>
            </div>
          </details>
        </div>
      </section>
    </>
  );
}

function SevaTypeCard({ item }: { item: SevaTypeImpact }) {
  const t = useTranslations("impact");
  const icon = isIcon(item.icon) ? item.icon : SEVA_ICON[item.sevaType];
  return (
    <li className={cx(pub.card, styles.program)}>
      <div className={styles.programHead}>
        <span className={pub.icwell}>
          <Icon name={icon} size={20} />
        </span>
        <h3 className={pub.h3}>
          <LocalText value={item.label} />
        </h3>
      </div>
      <dl>
        {item.figures.map((f) => (
          <div key={f.key}>
            <dt>
              <LocalText value={f.label} />
            </dt>
            <dd>
              <FigureValue value={f.figure.value} inline />
              {f.figure.estimate && f.figure.value !== null ? <EstimateBadge /> : null}
            </dd>
          </div>
        ))}
      </dl>
      <Link href={item.href} className={pub.more}>
        {t("aboutProgram")}
        <span className="sr-only">
          : <LocalText value={item.label} />
        </span>
        <Icon name="arrow-right" size={16} />
      </Link>
    </li>
  );
}
