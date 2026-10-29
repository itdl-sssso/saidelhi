import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import type { ProgramDetail, SevaType } from "@/contract";
import { Link } from "@/i18n/navigation";
import { type AppLocale, formatPeriodRange, formatTime, tx } from "@/lib/format";
import { ArticleCard, p1 } from "@/features/public/p1";
import { EventLinkRow, LocalText, PageHero, SectionHead, VolunteersBadge, pub } from "@/features/public/parts";
import { SEVA_ICON } from "@/features/public/seva";
import { Badge } from "@/ui/Badge";
import { Button } from "@/ui/Button";
import { Funnel } from "@/ui/Charts";
import { cx } from "@/ui/cx";
import { Icon, type IconName, icons } from "@/ui/Icon";
import { KpiTile } from "@/ui/KpiTile";
import styles from "./Programs.module.css";

type Variant = "eye" | "blood" | "medical" | "narayan_seva" | "bal_vikas" | "generic";

const STEP_ICONS: Record<Variant, IconName[]> = {
  eye: ["clipboard-list", "eye", "glasses", "heart-pulse"],
  blood: ["clipboard-list", "droplets", "clock", "heart"],
  medical: ["clipboard-list", "stethoscope", "pill", "heart-pulse"],
  narayan_seva: ["utensils", "hand", "hand-heart", "sparkles"],
  bal_vikas: ["clipboard-list", "book-open", "sparkles", "users"],
  generic: ["calendar-days", "map-pin", "hand-heart"],
};

/** Representative photo per seva type (legacy site media); types without one keep the icon tile. */
const HERO_PHOTO: Partial<Record<SevaType, string>> = {
  eye: "/images/programs/eye.webp",
  blood: "/images/programs/blood.webp",
  medical: "/images/programs/medical.webp",
  narayan_seva: "/images/programs/narayan_seva.webp",
  bal_vikas: "/images/programs/bal_vikas.webp",
  study_circle: "/images/programs/study_circle.webp",
  cleanliness: "/images/programs/cleanliness.webp",
};

const variantOf = (type: SevaType): Variant =>
  type === "eye" || type === "blood" || type === "medical" || type === "narayan_seva" || type === "bal_vikas" ? type : "generic";

export function ProgramView({ program: p }: { program: ProgramDetail }) {
  const t = useTranslations("program");
  const tp = useTranslations("programs");
  const locale = useLocale() as AppLocale;
  const variant = variantOf(p.sevaType);
  const icon: IconName = p.icon in icons ? (p.icon as IconName) : SEVA_ICON[p.sevaType];
  const stepCount = variant === "generic" ? 3 : 4;
  const period = p.kpis?.[0]?.period;
  const periodText = period ? formatPeriodRange(period.from, period.to, locale, (to) => t("upTo", { date: to })) : null;
  const hasEstimate = p.kpis?.some((k) => k.figure.estimate && k.figure.value !== null) ?? false;
  const funnel = p.funnel && p.funnel.length >= 2 ? p.funnel : null;

  const steps = Array.from({ length: stepCount }, (_, i) => {
    const n = i + 1;
    return {
      icon: STEP_ICONS[variant][i],
      title: t(`steps.${variant}.s${n}t` as "steps.eye.s1t"),
      body: t(`steps.${variant}.s${n}d` as "steps.eye.s1d"),
    };
  });

  return (
    <>
      <PageHero
        crumbs={[
          { label: t("crumbHome"), href: "/" },
          { label: t("crumbPrograms"), href: "/programs" },
          { label: <LocalText value={p.label} /> },
        ]}
      >
        <div className={styles.heroGrid}>
          <div className={pub.col} style={{ gap: 14 }}>
            <div className={pub.row}>
              <Badge tone="prem">{t("wingBadge", { wing: tp(`wing_${p.wing}`) })}</Badge>
            </div>
            <h1 className={pub.h1}>
              <LocalText value={p.label} />
            </h1>
            <p className={pub.lead}>{t(`lead.${p.sevaType}`)}</p>
          </div>
          <div className={styles.heroArt} aria-hidden="true">
            {HERO_PHOTO[p.sevaType] ? (
              <Image src={HERO_PHOTO[p.sevaType]!} alt="" fill sizes="280px" priority className={styles.heroImg} />
            ) : (
              <Icon name={icon} size={24} />
            )}
          </div>
        </div>
      </PageHero>

      <section className={pub.section} style={{ paddingTop: "var(--space-6)" }}>
        <div className={cx(pub.wrap, pub.stack)}>
          <div>
            <SectionHead title={t("stepsHeading")} />
            <ol className={p1.steps}>
              {steps.map((s) => (
                <li key={s.title} className={p1.step}>
                  <span className={pub.icwell}>
                    <Icon name={s.icon} size={20} />
                  </span>
                  <h3>{s.title}</h3>
                  <p>{s.body}</p>
                </li>
              ))}
            </ol>
          </div>

          {p.sevaType === "blood" ? (
            <div className={pub.card}>
              <h2 className={pub.h3}>{t("eligibilityTitle")}</h2>
              <ul className={p1.list}>
                {(["eligibility1", "eligibility2", "eligibility3", "eligibility4"] as const).map((k) => (
                  <li key={k}>
                    <Icon name="check" size={18} />
                    <span>{t(k)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div>
            <SectionHead title={t("resultsHeading")} sub={periodText ? t("resultsSub", { period: periodText }) : undefined} />
            {p.kpis && p.kpis.length ? (
              <>
                <div className={styles.kpis} data-count={p.kpis.length}>
                  {p.kpis.map((k) => (
                    <KpiTile
                      key={k.key}
                      label={<LocalText value={k.label} />}
                      figure={k.figure}
                      period={tx(k.period.label, locale)}
                      note={k.note ? <LocalText value={k.note} /> : undefined}
                    />
                  ))}
                </div>
                {hasEstimate ? (
                  <p className={pub.cap} style={{ marginTop: 10 }}>
                    {t("estimateNote")}
                  </p>
                ) : null}
              </>
            ) : (
              <p className={pub.small}>{t("resultsEmpty")}</p>
            )}
            {funnel ? (
              <div className={pub.card} style={{ marginTop: "var(--space-6)" }}>
                <h3 className={pub.h3}>{t("funnelHeading")}</h3>
                <Funnel title={t("funnelHeading")} steps={funnel.map((f) => ({ label: tx(f.label, locale), figure: f.figure }))} />
                <p className={pub.cap}>{t("funnelNote")}</p>
              </div>
            ) : null}
          </div>

          <div className={styles.main}>
            <div className={styles.col}>
              <div>
                <SectionHead
                  title={t("upcomingHeading")}
                  action={
                    <Link href={`/calendar?sevaType=${p.sevaType}`} className={pub.more}>
                      {t("calendar")}
                      <Icon name="arrow-right" size={16} />
                    </Link>
                  }
                />
                {p.upcoming.length ? (
                  <div className={cx(pub.card, pub.cardFlush)}>
                    <ul className={pub.evlist}>
                      {p.upcoming.map((e) => (
                        <EventLinkRow
                          key={e.id}
                          event={e}
                          chip
                          summary={
                            <>
                              <span className={pub.cap}>
                                {formatTime(e.startsAt, locale)} · {e.venue.name}
                              </span>
                              <VolunteersBadge event={e} />
                            </>
                          }
                        />
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className={pub.small}>{t("noUpcoming")}</p>
                )}
              </div>
              {p.articles.length ? (
                <div>
                  <SectionHead title={t("articlesHeading")} />
                  <ul className={p1.grid2} style={{ listStyle: "none", margin: 0, padding: 0 }}>
                    {p.articles.map((a) => (
                      <li key={a.slug}>
                        <ArticleCard article={a} />
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
            <div className={styles.side}>
              {p.partners.length ? (
                <div className={pub.card}>
                  <h2 className={pub.h3}>{t("partnersHeading")}</h2>
                  <ul className={p1.list}>
                    {p.partners.map((x) => (
                      <li key={x.id}>
                        <Icon name="handshake" size={18} />
                        <span>
                          {x.name}
                          {x.city ? `, ${x.city}` : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <div className={styles.vol}>
                <h2>{t("volunteerTitle")}</h2>
                <p className={pub.small}>{t("volunteerBody")}</p>
                <Button href={`/join?sevaType=${p.sevaType}`} icon="hand-heart">
                  {t("volunteerButton")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
