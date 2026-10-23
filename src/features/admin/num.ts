import type { AppLocale } from "@/lib/format";

/** Indian digit grouping in both languages. */
export const formatNumber = (n: number, locale: AppLocale): string => new Intl.NumberFormat(locale === "hi" ? "hi-IN" : "en-IN").format(n);
