"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import styles from "./LanguageToggle.module.css";

const OPTIONS: Array<{ locale: Locale; label: string; name: string }> = [
  { locale: "hi", label: "हिंदी", name: "हिंदी" },
  { locale: "en", label: "EN", name: "English" },
];

/** Links to the same path in the other language; the current language is marked, not disabled. */
export function LanguageToggle() {
  return <LanguageToggleView pathname={usePathname()} />;
}

/** Prerender fallback while the URL is unknown: links to the home page in each language. */
export function LanguageToggleView({ pathname }: { pathname: string }) {
  const t = useTranslations("nav");
  const locale = useLocale();
  return (
    <div role="group" aria-label={t("language")} className={styles.toggle}>
      {OPTIONS.map((o) => (
        <Link
          key={o.locale}
          href={pathname}
          locale={o.locale}
          lang={o.locale}
          hrefLang={o.locale}
          className={styles.option}
          aria-current={o.locale === locale ? "true" : undefined}
          title={o.locale === locale ? undefined : t("switchTo", { language: o.name })}
        >
          {o.label}
        </Link>
      ))}
    </div>
  );
}
