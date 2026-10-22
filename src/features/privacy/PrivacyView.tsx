import { useTranslations } from "next-intl";
import { PageHero, SectionHead, pub } from "@/features/public/parts";
import { cx } from "@/ui/cx";
import { Icon, type IconName } from "@/ui/Icon";
import { PrivacyRequestForm } from "./PrivacyRequestForm";
import styles from "./Privacy.module.css";

const SHORT = ["s1", "s2", "s3", "s4", "s5"] as const;
const SITUATIONS: { key: "camp" | "followup" | "volunteer" | "whatsapp" | "website"; icon: IconName }[] = [
  { key: "camp", icon: "stethoscope" },
  { key: "followup", icon: "heart-pulse" },
  { key: "volunteer", icon: "hand-heart" },
  { key: "whatsapp", icon: "message-circle" },
  { key: "website", icon: "globe" },
];
const RETENTION = ["counts", "followup", "photos", "volunteer", "whatsapp", "website"] as const;
const RIGHTS: { key: "access" | "correction" | "deletion" | "withdraw"; icon: IconName }[] = [
  { key: "access", icon: "eye" },
  { key: "correction", icon: "pencil" },
  { key: "deletion", icon: "trash-2" },
  { key: "withdraw", icon: "undo-2" },
];

export function PrivacyView() {
  const t = useTranslations("privacy");
  return (
    <>
      <PageHero
        crumbs={[
          { label: t("crumbHome"), href: "/" },
          { label: t("crumb") },
        ]}
      >
        <span className={styles.version}>
          <Icon name="file-text" size={16} />
          {t("versionPill")}
        </span>
        <h1 className={pub.h1}>{t("title")}</h1>
        <p className={pub.lead}>{t("lead")}</p>
      </PageHero>

      <section className={pub.section} style={{ paddingTop: "var(--space-4)" }} aria-labelledby="privacy-short">
        <div className={pub.wrap}>
          <div className={cx(pub.card, styles.short)}>
            <h2 id="privacy-short" className={pub.h3}>
              {t("shortHeading")}
            </h2>
            <ul className={styles.ul}>
              {SHORT.map((k) => (
                <li key={k}>
                  <Icon name="check" size={18} />
                  <span>{t(`short.${k}`)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className={pub.section} style={{ paddingTop: 0 }} aria-labelledby="privacy-collect">
        <div className={pub.wrap}>
          <SectionHead id="privacy-collect" title={t("collectHeading")} sub={t("collectSub")} />
          <ul className={styles.situations}>
            {SITUATIONS.map((s) => (
              <li key={s.key} className={pub.card}>
                <div className={styles.cardHead}>
                  <span className={pub.icwell}>
                    <Icon name={s.icon} size={20} />
                  </span>
                  <h3 className={pub.h3}>{t(`sit.${s.key}.title`)}</h3>
                </div>
                <div className={styles.kv}>
                  <span>{t("keepLabel")}</span>
                  <p>{t(`sit.${s.key}.keep`)}</p>
                </div>
                <div className={styles.kv}>
                  <span>{t("whoLabel")}</span>
                  <p>{t(`sit.${s.key}.who`)}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className={pub.section} style={{ paddingTop: 0 }} aria-labelledby="privacy-retention">
        <div className={pub.wrap}>
          <SectionHead id="privacy-retention" title={t("retentionHeading")} />
          <table className={cx(pub.tbl, styles.retention)}>
            <caption className="sr-only">{t("retentionHeading")}</caption>
            <thead>
              <tr>
                <th scope="col">{t("colWhat")}</th>
                <th scope="col">{t("colKept")}</th>
                <th scope="col">{t("colThen")}</th>
              </tr>
            </thead>
            <tbody>
              {RETENTION.map((r) => (
                <tr key={r}>
                  <th scope="row">{t(`ret.${r}.what`)}</th>
                  <td>{t(`ret.${r}.kept`)}</td>
                  <td>
                    <span className={styles.thenLabel}>{t("colThen")}: </span>
                    {t(`ret.${r}.then`)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={cx(pub.section, pub.sectionCalm)} aria-labelledby="privacy-rights">
        <div className={cx(pub.wrap, styles.rightsLayout)}>
          <div className={pub.col} style={{ gap: "var(--space-5)" }}>
            <SectionHead id="privacy-rights" title={t("rightsHeading")} sub={t("rightsSub")} />
            <ul className={styles.rights}>
              {RIGHTS.map((r) => (
                <li key={r.key}>
                  <span className={pub.icwell}>
                    <Icon name={r.icon} size={20} />
                  </span>
                  <div>
                    <b>{t(`rights.${r.key}.title`)}</b>
                    <p className={pub.small}>{t(`rights.${r.key}.body`)}</p>
                  </div>
                </li>
              ))}
            </ul>
            <div className={pub.card} style={{ gap: 8 }}>
              <h3 className={styles.leadLabel}>{t("dpoLabel")}</h3>
              <p className={styles.dpoName}>{t("dpoName")}</p>
              <p className={pub.small}>{t("dpoNote")}</p>
              <p className={pub.small}>{t("dpoBoard")}</p>
            </div>
          </div>
          <div id="request">
            <h2 className="sr-only">{t("formTitle")}</h2>
            <PrivacyRequestForm />
          </div>
        </div>
      </section>

      <section className={pub.section} style={{ paddingTop: "var(--space-6)", paddingBottom: "var(--space-8)" }}>
        <div className={pub.wrap}>
          <p className={pub.cap}>{t("versionLine")}</p>
        </div>
      </section>
    </>
  );
}
