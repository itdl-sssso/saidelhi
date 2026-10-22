"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import langStyles from "@/features/shell/LanguageToggle.module.css";
import { Link, usePathname } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

const OPTIONS: Array<{ locale: Locale; label: string; name: string }> = [
  { locale: "hi", label: "हिंदी", name: "हिंदी" },
  { locale: "en", label: "EN", name: "English" },
];

/** Same page in the other language, keeping the query string (filters, ?next=). */
export function LanguageSwitch() {
  const t = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();
  const qs = useSearchParams().toString();
  const href = qs ? `${pathname}?${qs}` : pathname;
  return (
    <div role="group" aria-label={t("language")} className={langStyles.toggle}>
      {OPTIONS.map((o) => (
        <Link
          key={o.locale}
          href={href}
          locale={o.locale}
          lang={o.locale}
          hrefLang={o.locale}
          className={langStyles.option}
          aria-current={o.locale === locale ? "true" : undefined}
          title={o.locale === locale ? undefined : t("switchTo", { language: o.name })}
        >
          {o.label}
        </Link>
      ))}
    </div>
  );
}
