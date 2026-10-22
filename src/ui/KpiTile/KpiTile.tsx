import type { ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Sparkline } from "../Charts/Sparkline";
import type { Figure } from "../data/types";
import { EstimateBadge, FigureValue } from "../Figure";
import { Icon, type IconName } from "../Icon";
import { cx } from "../cx";
import styles from "./KpiTile.module.css";

export type KpiTileProps = {
  label: ReactNode;
  figure: Figure;
  period?: ReactNode;
  icon?: IconName;
  sparkline?: number[];
  /** Percentage change against the previous period; null or omitted hides the delta. */
  deltaPct?: number | null;
  note?: ReactNode;
  compact?: boolean;
  className?: string;
};

export function KpiTile({
  label,
  figure,
  period,
  icon,
  sparkline,
  deltaPct,
  note,
  compact,
  className,
}: KpiTileProps) {
  const t = useTranslations("common");
  const locale = useLocale();
  const direction = deltaPct == null ? null : deltaPct > 0 ? "up" : deltaPct < 0 ? "down" : "flat";
  const deltaText =
    deltaPct == null
      ? null
      : `${deltaPct > 0 ? "+" : ""}${new Intl.NumberFormat(`${locale}-IN`, { maximumFractionDigits: 1 }).format(deltaPct)}%`;

  return (
    <div className={cx(styles.root, compact && styles.compact, className)}>
      <div className={styles.top}>
        <p className={styles.label}>{label}</p>
        {icon ? (
          <span className={styles.icon}>
            <Icon name={icon} size={20} />
          </span>
        ) : null}
      </div>
      <p className={styles.value}>
        <FigureValue value={figure.value} />
      </p>
      <div className={styles.foot}>
        <div className={styles.meta}>
          {period ? <span className={styles.period}>{period}</span> : null}
          {direction && deltaText ? (
            <span className={cx(styles.delta, styles[direction])}>
              <Icon
                name={direction === "up" ? "arrow-up-right" : direction === "down" ? "arrow-down-right" : "arrow-right"}
                size={16}
              />
              {t("deltaFromLast", { delta: deltaText })}
            </span>
          ) : null}
          {figure.estimate && figure.value !== null ? <EstimateBadge /> : null}
        </div>
        {sparkline ? <Sparkline data={sparkline} /> : null}
      </div>
      {note ? <p className={styles.note}>{note}</p> : null}
    </div>
  );
}
