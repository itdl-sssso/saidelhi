import { useLocale, useTranslations } from "next-intl";
import { formatCount, isSuppressed } from "../data/format";
import type { PublicCount } from "../data/types";
import { Icon } from "../Icon";
import { Tip } from "../Tip";
import { cx } from "../cx";
import styles from "./Figure.module.css";

export type FigureValueProps = {
  value: PublicCount | null;
  /** Inline keeps "fewer than 5" at the surrounding font size (tables, prose). */
  inline?: boolean;
  className?: string;
};

/** Renders a public count: "—" when not reported, "fewer than 5" when suppressed, else Indian grouping. */
export function FigureValue({ value, inline, className }: FigureValueProps) {
  const t = useTranslations("common");
  const locale = useLocale();
  if (value === null) {
    return (
      <Tip tip={t("notReported")} describe={false} className={className}>
        <span className={styles.dash} aria-hidden="true">
          —
        </span>
        <span className="sr-only">{t("notReported")}</span>
      </Tip>
    );
  }
  if (isSuppressed(value)) {
    return (
      <span className={cx(inline && styles.inline, className)}>
        <span className={styles.lt5}>{t("fewerThan5")}</span>
      </span>
    );
  }
  return <span className={className}>{formatCount(value, locale)}</span>;
}

export function EstimateBadge({ tooltip }: { tooltip?: string }) {
  const t = useTranslations("common");
  return (
    <Tip tip={tooltip ?? t("estimateTooltip")}>
      <span className={styles.estimate}>
        <Icon name="hash" size={16} />
        {t("estimate")}
      </span>
    </Tip>
  );
}
