import { useLocale, useTranslations } from "next-intl";
import type { DemographicSplit, DistrictPayload, SevaTypeImpact } from "@/contract";
import { Link } from "@/i18n/navigation";
import { type AppLocale, formatPeriodRange, tx } from "@/lib/format";
import { EventLinkRow, LocalText, PageHero, SectionHead, VolunteersBadge, pub } from "@/features/public/parts";
import { p1 } from "@/features/public/p1";
import { cx } from "@/ui/cx";
import { EmptyState } from "@/ui/EmptyState";
import { FigureValue } from "@/ui/Figure";
import { Icon, type IconName, icons } from "@/ui/Icon";
import { KpiTile } from "@/ui/KpiTile";
import styles from "./DistrictView.module.css";

const iconFor = (name: string): IconName => (name in icons ? (name as IconName) : "hand-heart");

export function DistrictView({ data }: { data: DistrictPayload }) {
  const t = useTranslations("district");
  const locale = useLocale() as AppLocale;
  const name = tx(data.district.name, locale);
  const period = data.kpis?.[0]?.period;
  const periodText = period ? formatPeriodRange(period.from, period.to, locale, (to) => t("upTo", { date: to })) : null;

  return (
    <>
      <PageHero
        crumbs={[
          { label: t("crumbHome"), href: "/" },
          { label: t("crumbAbout"), href: "/about" },
          { label: t("crumbDistricts"), href: "/about#districts" },
          { label: t("districtName", { name }) },
        ]}
      >
        <h1 className={pub.h1}>{t("districtName", { name })}</h1>
        <p className={pub.lead}>
          {data.intro ? <LocalText value={data.intro} /> : t("introFallback", { count: data.samithiCount })}
        </p>
        <p className={pub.cap}>
          {t("samithiCount", { count: data.samithiCount })}
          {periodText ? ` · ${t("approvedOnly", { period: periodText })}` : ""}
        </p>
      </PageHero>

      <section className={pub.section} style={{ paddingTop: "var(--space-6)" }}>
        <div className={cx(pub.wrap, pub.stack)}>
          {data.kpis ? (
            <div className={styles.kpis}>
              {data.kpis.map((k) => (
                <KpiTile
                  key={k.key}
                  label={<LocalText value={k.label} />}
                  figure={k.figure}
                  period={tx(k.period.label, locale)}
                  note={k.note ? <LocalText value={k.note} /> : undefined}
                />
              ))}
            </div>
          ) : (
            <div className={pub.card}>
              <EmptyState icon="sprout" headingLevel={2} title={t("emptyTitle")} body={t("emptyBody", { name })} />
            </div>
          )}

          {data.bySevaType.length ? (
            <div>
              <SectionHead title={t("bySevaType")} sub={t("demographicsNote")} />
              <div className={p1.grid2}>
                {data.bySevaType.map((s) => (
                  <SevaCard key={s.sevaType} item={s} />
                ))}
              </div>
            </div>
          ) : null}

          {data.demographics.length ? (
            <div>
              <SectionHead title={t("whoWeServe")} sub={t("whoWeServeSub")} />
              <div className={p1.grid2}>
                {data.demographics.map((d) => (
                  <Split key={d.key} split={d} />
                ))}
              </div>
            </div>
          ) : null}

          <div className={p1.grid2}>
            <div>
              <SectionHead
                title={t("upcomingHeading", { name })}
                action={
                  <Link href={`/calendar?district=${data.district.slug}`} className={pub.more}>
                    {t("calendar")}
                    <Icon name="arrow-right" size={16} />
                  </Link>
                }
              />
              {data.upcoming.length ? (
                <div className={cx(pub.card, pub.cardFlush)}>
                  <ul className={pub.evlist}>
                    {data.upcoming.map((e) => (
                      <EventLinkRow key={e.id} event={e} chip summary={<VolunteersBadge event={e} />} />
                    ))}
                  </ul>
                </div>
              ) : (
                <p className={pub.small}>{t("noUpcoming")}</p>
              )}
            </div>
            <div>
              <SectionHead title={t("centresHeading")} />
              {data.centres.length ? (
                <div className={cx(pub.card, pub.cardFlush)}>
                  <ul className={styles.centres}>
                    {data.centres.map((c) => (
                      <li key={c.slug}>
                        <Link href={`/centres/${c.slug}`} className={styles.centre}>
                          <LocalText value={c.name} />
                          <Icon name="chevron-right" size={18} />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className={pub.small}>{t("noCentres")}</p>
              )}
            </div>
          </div>

          <Link href="/impact" className={p1.moreLink}>
            <Icon name="arrow-left" size={18} />
            {t("allDistricts")}
          </Link>
        </div>
      </section>
    </>
  );
}

function SevaCard({ item }: { item: SevaTypeImpact }) {
  return (
    <div className={pub.card}>
      <div className={styles.cardHead}>
        <span className={pub.icwell}>
          <Icon name={iconFor(item.icon)} size={20} />
        </span>
        <h3 className={pub.h3}>
          <Link href={item.href} className={styles.cardLink}>
            <LocalText value={item.label} />
          </Link>
        </h3>
      </div>
      <dl className={styles.dl}>
        {item.figures.map((f) => (
          <div key={f.key}>
            <dt>
              <LocalText value={f.label} />
            </dt>
            <dd>
              <FigureValue value={f.figure.value} inline />
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Split({ split }: { split: DemographicSplit }) {
  const total = split.bars.reduce((s, b) => s + (typeof b.figure.value === "number" ? b.figure.value : 0), 0);
  return (
    <div className={pub.card}>
      <h3 className={pub.h3}>
        <LocalText value={split.label} />
      </h3>
      <ul className={styles.bars}>
        {split.bars.map((b) => {
          const v = b.figure.value;
          const pct = typeof v === "number" && total > 0 ? (v / total) * 100 : 0;
          return (
            <li key={b.key}>
              <LocalText value={b.label} />
              <span className={styles.track} aria-hidden="true">
                <i style={{ width: `${pct}%` }} />
              </span>
              <b>
                <FigureValue value={v} inline />
              </b>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
