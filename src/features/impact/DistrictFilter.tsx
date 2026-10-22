"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useHydrated } from "@/lib/useHydrated";
import { Select } from "@/ui/Select";
import styles from "./ImpactView.module.css";

/**
 * District filter kept in the URL (?district=). Works as a plain GET form without
 * JavaScript; with it, changing the select navigates straight away.
 */
export function DistrictFilter({
  period,
  value,
  options,
}: {
  period: string;
  value: string;
  options: { value: string; label: string }[];
}) {
  const t = useTranslations("impact");
  const router = useRouter();
  // The submit button is only for visitors without JavaScript.
  const enhanced = useHydrated();
  const [pending, startTransition] = useTransition();

  return (
    <form method="get" className={styles.districtForm} aria-busy={pending || undefined}>
      <input type="hidden" name="period" value={period} />
      <Select
        name="district"
        label={t("districtLabel")}
        value={value}
        options={[{ value: "", label: t("allDistricts") }, ...options]}
        onChange={(e) => {
          const next = e.target.value;
          const query: Record<string, string> = { period };
          if (next) query.district = next;
          startTransition(() => router.push({ pathname: "/impact", query }, { scroll: false }));
        }}
      />
      {enhanced ? null : (
        <button type="submit" className={styles.apply}>
          {t("apply")}
        </button>
      )}
    </form>
  );
}
