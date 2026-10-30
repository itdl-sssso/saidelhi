import { useTranslations } from "next-intl";
import { PageHero, SectionHead, pub } from "@/features/public/parts";
import { Button } from "@/ui/Button";
import { cx } from "@/ui/cx";
import { Eyebrow } from "@/ui/Eyebrow";
import { Icon } from "@/ui/Icon";
import { CopyButton } from "./CopyButton";
import { BANK, CONTACT, RECEIPT_FIELDS } from "./details";
import styles from "./Donate.module.css";

const AREAS = ["area1", "area2", "area3", "area4"] as const;

export function DonateView() {
  const t = useTranslations("donate");

  const rows: Array<{ label: string; value: string; copy: string; mono?: boolean }> = [
    { label: t("fAccountName"), value: BANK.accountName, copy: t("copyAccountName") },
    { label: t("fBank"), value: BANK.bank, copy: t("copyBank") },
    { label: t("fBranch"), value: BANK.branch, copy: t("copyBranch") },
    { label: t("fBranchCode"), value: BANK.branchCode, copy: t("copyBranchCode"), mono: true },
    { label: t("fAccountNo"), value: BANK.accountNo, copy: t("copyAccountNo"), mono: true },
    { label: t("fIfsc"), value: BANK.ifsc, copy: t("copyIfsc"), mono: true },
    { label: t("fMicr"), value: BANK.micr, copy: t("copyMicr"), mono: true },
  ];

  // Template only: no personal data is ever prefilled.
  const body = [t("mailIntro"), "", ...RECEIPT_FIELDS.map((k) => `${t(`f_${k}`)}: `)].join("\n");
  const mailto = `mailto:${CONTACT.email}?subject=${encodeURIComponent(t("mailSubject"))}&body=${encodeURIComponent(body)}`;

  return (
    <>
      <PageHero crumbs={[{ label: t("crumbHome"), href: "/" }, { label: t("crumb") }]}>
        <Eyebrow>{t("eyebrow")}</Eyebrow>
        <h1 className={pub.h1}>{t("title")}</h1>
        <p className={pub.lead}>{t("lead")}</p>
      </PageHero>

      <section className={pub.section} style={{ paddingTop: "var(--space-4)" }}>
        <div className={cx(pub.wrap, styles.layout)}>
          <div className={styles.stack}>
            <section className={pub.card} aria-labelledby="donate-bank">
              <SectionHead id="donate-bank" title={t("bankTitle")} sub={t("bankSub")} />
              <dl className={styles.bank}>
                {rows.map((r) => (
                  <div className={styles.row} key={r.label}>
                    <dt>{r.label}</dt>
                    <dd className={r.mono ? styles.mono : undefined}>{r.value}</dd>
                    <CopyButton value={r.value} label={r.copy} copiedLabel={t("copied")} />
                  </div>
                ))}
              </dl>
            </section>

            <section className={pub.card} aria-labelledby="donate-who">
              <h2 id="donate-who" className={pub.h3}>
                {t("whoTitle")}
              </h2>
              <p className={styles.prose}>{t("whoBody")}</p>
              <p className={styles.note}>
                <Icon name="info" size={18} />
                <span>{t("whoNote")}</span>
              </p>
            </section>
          </div>

          <div className={styles.stack}>
            <section className={pub.card} aria-labelledby="donate-after">
              <h2 id="donate-after" className={pub.h3}>
                {t("afterTitle")}
              </h2>
              <p className={styles.prose}>{t("afterBody")}</p>
              <ol className={styles.steps}>
                <li>{t.rich("step1", { email: () => <a href={mailto}>{CONTACT.email}</a> })}</li>
                <li>
                  {t("step2")}
                  <ul className={styles.list} style={{ marginTop: 10 }}>
                    {RECEIPT_FIELDS.map((k) => (
                      <li key={k}>
                        <Icon name="check" size={18} />
                        <span>{t(`f_${k}`)}</span>
                      </li>
                    ))}
                  </ul>
                </li>
              </ol>
              <div className={styles.actions}>
                <Button href={mailto} icon="mail">
                  {t("mailCta")}
                </Button>
              </div>
            </section>

            <section className={pub.card} aria-labelledby="donate-trust">
              <h2 id="donate-trust" className={pub.h3}>
                {t("trustTitle")}
              </h2>
              <p className={styles.prose}>{t("trustIntro")}</p>
              <ul className={styles.list}>
                {AREAS.map((a) => (
                  <li key={a}>
                    <Icon name="circle-check" size={18} />
                    <span>{t(a)}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className={pub.card} aria-labelledby="donate-contact">
              <h2 id="donate-contact" className={pub.h3}>
                {t("contactTitle")}
              </h2>
              <ul className={styles.contact}>
                <li>
                  <Icon name="map-pin" size={18} />
                  <span>
                    <b>{t("orgName")}</b>
                    <br />
                    {t("address")}
                  </span>
                </li>
                <li>
                  <Icon name="phone" size={18} />
                  <span>
                    {t("phoneLabel")}: <a href={`tel:${CONTACT.phoneTel}`}>{CONTACT.phoneDisplay}</a>
                  </span>
                </li>
                <li>
                  <Icon name="mail" size={18} />
                  <span>
                    {t("emailLabel")}: <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
                  </span>
                </li>
              </ul>
              <div className={styles.actions}>
                <Button href={CONTACT.whatsapp} external variant="outline" icon="message-circle">
                  {t("whatsappCta")}
                </Button>
              </div>
            </section>
          </div>
        </div>
      </section>
    </>
  );
}
