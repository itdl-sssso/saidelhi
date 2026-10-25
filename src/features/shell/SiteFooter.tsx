import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { DharmaRule } from "@/ui/DharmaRule";
import { Icon } from "@/ui/Icon";
import { EMBLEM_SRC, SAICONNECT_URL } from "./links";
import styles from "./SiteFooter.module.css";

export function SiteFooter() {
  const t = useTranslations("footer");
  const tm = useTranslations("meta");
  const tc = useTranslations("common");

  const external = (href: string, label: string) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className={styles.link}>
      {label}
      <Icon name="external-link" size={16} />
      <span className="sr-only"> {tc("opensNewTab")}</span>
    </a>
  );

  return (
    <>
      <DharmaRule height={3} />
      <footer className={styles.footer}>
        <div className={styles.wrap}>
          <div className={styles.grid}>
            <div className={styles.brand}>
              <Image className={styles.emblem} src={EMBLEM_SRC} alt={t("emblemAlt")} width={56} height={56} />
              <h2 className={styles.heading}>{tm("orgName")}</h2>
              <p className={styles.text}>{t("tagline")}</p>
            </div>
            <nav aria-labelledby="footer-visit">
              <h2 id="footer-visit" className={styles.heading}>
                {t("visit")}
              </h2>
              <ul className={styles.links}>
                <li>
                  <Link href="/about" className={styles.link}>
                    {t("about")}
                  </Link>
                </li>
                <li>
                  <Link href="/programs" className={styles.link}>
                    {t("programs")}
                  </Link>
                </li>
                <li>
                  <Link href="/news" className={styles.link}>
                    {t("news")}
                  </Link>
                </li>
                <li>
                  <Link href="/calendar" className={styles.link}>
                    {t("calendar")}
                  </Link>
                </li>
                <li>
                  <Link href="/centres/map" className={styles.link}>
                    {t("centres")}
                  </Link>
                </li>
                <li>
                  <Link href="/impact" className={styles.link}>
                    {t("impact")}
                  </Link>
                </li>
              </ul>
            </nav>
            <nav aria-labelledby="footer-serve">
              <h2 id="footer-serve" className={styles.heading}>
                {t("serve")}
              </h2>
              <ul className={styles.links}>
                <li>
                  <Link href="/join" className={styles.link}>
                    {t("joinSeva")}
                  </Link>
                </li>
                <li>
                  <Link href="/donate" className={styles.link}>
                    {t("donate")}
                  </Link>
                </li>
                <li>{external(SAICONNECT_URL, t("saiConnect"))}</li>
              </ul>
            </nav>
          </div>
          <div className={styles.fine}>
            <p>{t("disclaimer")}</p>
            <div className={styles.fineLinks}>
              <Link href="/privacy" className={styles.link}>
                {t("privacy")}
              </Link>
              <Link href="/admin/login" className={styles.link}>
                {t("coordinatorLogin")}
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
