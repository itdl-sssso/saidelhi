import { Suspense, type ReactNode } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { LanguageToggle, EMBLEM_SRC } from "@/features/shell";
import { LanguageToggleView } from "@/features/shell/LanguageToggle";
import { DharmaRule } from "@/ui/DharmaRule";
import styles from "./formlink.module.css";

/** The bare frame of every /f/ page: emblem, language toggle, gold rule. No site navigation (specs 19-22). */
export function FormChrome({ children }: { children: ReactNode }) {
  const t = useTranslations("meta");
  return (
    <div className={styles.frame}>
      <header className={styles.header}>
        <div className={styles.headerRow}>
          <span className={styles.brand}>
            <Image src={EMBLEM_SRC} alt="" width={36} height={36} className={styles.emblem} priority />
            <span className={styles.brandName}>{t("orgName")}</span>
          </span>
          <Suspense fallback={<LanguageToggleView pathname="/" />}>
            <LanguageToggle />
          </Suspense>
        </div>
        <DharmaRule height={2} />
      </header>
      <main id="main" tabIndex={-1} className={styles.main}>
        {children}
      </main>
    </div>
  );
}
