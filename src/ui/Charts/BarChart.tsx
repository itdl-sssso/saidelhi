import type { ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatCount, isSuppressed, plotValue } from "../data/format";
import type { Figure } from "../data/types";
import { cx } from "../cx";
import { DataTable } from "./DataTable";
import styles from "./Charts.module.css";

export type BarDatum = { label: string; figure: Figure };

export type BarChartProps = {
  data: BarDatum[];
  /** Names the chart for screen readers and heads the fallback table. */
  title: string;
  caption?: ReactNode;
  height?: number;
  className?: string;
};

export function BarChart({ data, title, caption, height = 180, className }: BarChartProps) {
  const t = useTranslations("common");
  const locale = useLocale();
  const max = Math.max(1, ...data.map((d) => plotValue(d.figure.value)));
  const hasEstimate = data.some((d) => d.figure.estimate);
  const hasNone = data.some((d) => d.figure.value === null);

  return (
    <figure className={cx(styles.figure, className)}>
      <div aria-hidden="true">
        <div className={styles.bars} style={{ height }}>
          {data.map((d) => {
            const v = d.figure.value;
            return (
              <div key={d.label} className={styles.bar}>
                <span className={styles.barValue}>
                  {v === null ? "—" : isSuppressed(v) ? t("fewerThan5") : formatCount(v, locale)}
                </span>
                <div
                  className={cx(
                    styles.barFill,
                    v === null && styles.barNone,
                    v !== null && d.figure.estimate && styles.barEstimate,
                  )}
                  style={v === null ? undefined : { height: `${Math.max((plotValue(v) / max) * 85, 2)}%` }}
                />
              </div>
            );
          })}
        </div>
        <div className={styles.axis}>
          {data.map((d) => (
            <span key={d.label}>{d.label}</span>
          ))}
        </div>
      </div>
      <DataTable title={title} rows={data.map((d) => ({ label: d.label, figure: d.figure }))} />
      {caption || hasEstimate || hasNone ? (
        <figcaption className={cx(styles.legend, styles.caption)}>
          {hasEstimate ? (
            <>
              <span>
                <i className={cx(styles.swatch, styles.swApproved)} />
                {t("approved")}
              </span>
              <span>
                <i className={cx(styles.swatch, styles.swEstimate)} />
                {t("estimate")}
              </span>
            </>
          ) : null}
          {hasNone ? (
            <span>
              <i className={cx(styles.swatch, styles.swNone)} />
              {t("notReported")}
            </span>
          ) : null}
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
