import Image from "next/image";
import { useTranslations } from "next-intl";
import type { DistrictSummary, Wing } from "@/contract";
import { Link } from "@/i18n/navigation";
import { WINGS } from "@/features/programs/ProgramsView";
import { LocalText, PageHero, SectionHead, pub } from "@/features/public/parts";
import { p1 } from "@/features/public/p1";
import { Button } from "@/ui/Button";
import { cx } from "@/ui/cx";
import { Eyebrow } from "@/ui/Eyebrow";
import { Icon, type IconName } from "@/ui/Icon";
import styles from "./About.module.css";

const WING_ICON: Record<Wing, IconName> = {
  service: "hand-heart",
  educational: "graduation-cap",
  spiritual: "music",
  mahila: "flower-2",
  youth: "heart-handshake",
};
const PRINCIPLES: Array<{ n: 1 | 2 | 3; icon: IconName }> = [
  { n: 1, icon: "gift" },
  { n: 2, icon: "users" },
  { n: 3, icon: "hand" },
];

export function AboutView({ districts }: { districts: DistrictSummary[] }) {
  const t = useTranslations("about");
  const samithis = districts.reduce((s, d) => s + d.samithiCount, 0);

  return (
    <>
      <PageHero crumbs={[{ label: t("crumbHome"), href: "/" }, { label: t("crumbAbout") }]}>
        <Eyebrow>{t("eyebrow")}</Eyebrow>
        <h1 className={pub.h1}>{t("title")}</h1>
        <p className={pub.lead}>{t("lead")}</p>
      </PageHero>

      <section className={pub.section}>
        <div className={cx(pub.wrap, styles.founder)}>
          <figure className={styles.portrait}>
            <Image src="/images/about/founder.webp" alt={t("founderPhotoAlt")} fill sizes="(min-width: 900px) 40vw, 100vw" />
          </figure>
          <div className={pub.col} style={{ gap: 14 }}>
            <Eyebrow>{t("founderEyebrow")}</Eyebrow>
            <h2 className={pub.h2}>{t("founderName")}</h2>
            <p className={pub.cap}>{t("founderYears")}</p>
            <div className={styles.prose}>
              <p>{t("founderP1")}</p>
              <p>{t("founderP2")}</p>
            </div>
            <blockquote className={styles.quote}>“{t("founderQuote")}”</blockquote>
          </div>
        </div>
      </section>

      <section className={cx(pub.section, pub.sectionCalm)}>
        <div className={pub.wrap}>
          <SectionHead title={t("wingsTitle")} sub={t("wingsSub")} />
          <ul className={styles.wings}>
            {WINGS.map((w) => (
              <li key={w}>
                <Link href={`/programs?wing=${w}`} className={styles.wing}>
                  <span className={pub.icwell}>
                    <Icon name={WING_ICON[w]} size={20} />
                  </span>
                  <h3 className={pub.h3}>{t(`wing_${w}`)}</h3>
                  <p className={pub.small}>{t(`wingDesc_${w}`)}</p>
                  <span className={pub.more}>
                    {t("wingProgrammes")}
                    <Icon name="arrow-right" size={16} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className={pub.section} id="districts">
        <div className={pub.wrap}>
          <SectionHead title={t("orgTitle")} sub={t("orgSub")} />
          <div className={styles.org}>
            <div className={styles.orgTop}>
              <Icon name="globe" size={20} />
              <b>{t("orgTop")}</b>
              <span className={pub.cap}>{t("orgTopSub")}</span>
            </div>
            <div className={styles.line} aria-hidden="true" />
            {districts.length ? (
              <ul className={styles.orgDistricts} aria-label={t("orgDistricts")}>
                {districts.map((d) => (
                  <li key={d.district.slug}>
                    <Link href={`/districts/${d.district.slug}`}>
                      <b>
                        <LocalText value={d.district.name} />
                      </b>
                      <span>{t("orgSamithis", { count: d.samithiCount })}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={pub.small}>{t("orgEmpty")}</p>
            )}
            {samithis > 0 ? (
              <>
                <div className={styles.line} aria-hidden="true" />
                <div className={styles.orgFoot}>
                  <Icon name="house" size={18} />
                  {t("orgFoot", { count: samithis })}
                </div>
              </>
            ) : null}
          </div>
        </div>
      </section>

      <section className={pub.section} style={{ paddingTop: 0 }}>
        <div className={pub.wrap}>
          <SectionHead title={t("principlesTitle")} />
          <ul className={p1.grid3}>
            {PRINCIPLES.map((p) => (
              <li key={p.n}>
                <div className={pub.card} style={{ height: "100%" }}>
                  <span className={pub.icwell}>
                    <Icon name={p.icon} size={20} />
                  </span>
                  <h3 className={pub.h3}>{t(`p${p.n}t`)}</h3>
                  <p className={pub.small}>{t(`p${p.n}d`)}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className={cx(pub.section, pub.sectionCalm)}>
        <div className={pub.wrap}>
          <div className={styles.find}>
            <div className={pub.col} style={{ gap: 6 }}>
              <h2 className={pub.h2}>{t("findTitle")}</h2>
              <p className={pub.small}>{t("findBody")}</p>
            </div>
            <form action="/centres/map" method="get" role="search" className={styles.search}>
              <label className={styles.ctl}>
                <span className="sr-only">{t("findLabel")}</span>
                <Icon name="search" size={18} />
                <input name="q" type="search" placeholder={t("findPlaceholder")} maxLength={80} autoComplete="postal-code" />
              </label>
              <Button type="submit">{t("findButton")}</Button>
            </form>
          </div>
        </div>
      </section>

      <section className={pub.section} id="contact" style={{ paddingTop: "var(--space-8)" }}>
        <div className={pub.wrap}>
          <div className={p1.band}>
            <div>
              <h2 className={pub.h3}>{t("contactTitle")}</h2>
              <p className={pub.small}>{t("contactBody")}</p>
            </div>
          </div>
          <div className={styles.contactGrid}>
            <article className={styles.contactCard}>
              <div className={styles.contactImg}>
                <Image src="/images/about/international.webp" alt={t("centreImageAlt")} fill sizes="(min-width: 900px) 45vw, 100vw" />
              </div>
              <div className={styles.contactBody}>
                <h3 className={pub.h3}>{t("contactOfficeTitle")}</h3>
                <p className={pub.small}>
                  <strong>{t("contactOfficeName")}</strong>
                  <br />
                  {t("contactOfficeAddress")}
                </p>
                <ul className={styles.contactList}>
                  <li>
                    <Icon name="phone" size={16} />
                    <a href="tel:+919971999991">+91 99719 99991</a>
                  </li>
                  <li>
                    <Icon name="mail" size={16} />
                    <a href="mailto:sp.dl@ssssoindia.org">sp.dl@ssssoindia.org</a>
                  </li>
                </ul>
              </div>
            </article>
            <article className={styles.contactCard}>
              <div className={styles.contactImg}>
                <Image src="/images/about/auditorium.webp" alt={t("audImageAlt")} fill sizes="(min-width: 900px) 45vw, 100vw" />
              </div>
              <div className={styles.contactBody}>
                <h3 className={pub.h3}>{t("contactAudTitle")}</h3>
                <p className={pub.small}>{t("contactAudBody")}</p>
                <ul className={styles.contactList}>
                  <li>
                    <Icon name="phone" size={16} />
                    <span>
                      <a href="tel:+911124363221">011-2436 3221</a> · <a href="tel:+911124360190">011-2436 0190</a>
                    </span>
                  </li>
                  <li>
                    <Icon name="mail" size={16} />
                    <a href="mailto:bookings.sssic@gmail.com">bookings.sssic@gmail.com</a>
                  </li>
                </ul>
              </div>
            </article>
          </div>
        </div>
      </section>
    </>
  );
}
