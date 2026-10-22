import { useTranslations } from "next-intl";
import styles from "./SkipLink.module.css";

export const MAIN_ID = "main";

export function SkipLink() {
  const t = useTranslations("nav");
  return (
    <a href={`#${MAIN_ID}`} className={styles.skip}>
      {t("skipToContent")}
    </a>
  );
}
