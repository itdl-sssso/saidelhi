import type { ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatCount, plotValue } from "../data/format";
import type { Figure } from "../data/types";
import { cx } from "../cx";
import { DataTable } from "./DataTable";
import styles from "./Charts.module.css";

export type LinePoint = { label: string; figure: Figure };

export type LineChartProps = {
  data: LinePoint[];
  title: string;
  caption?: ReactNode;
  height?: number;
  className?: string;
};

function niceMax(n: number): number {
  if (n <= 10) return 10;
  const magnitude = 10 ** Math.floor(Math.log10(n));
  return Math.ceil(n / magnitude) * magnitude;
}

/**
 * Estimates draw as a dashed segment over a hatched column; unreported months leave a gap.
 * Geometry is in percentages so the chart reflows without scaling its text.
 */
export function LineChart({ data, title, caption, height = 200, className }: LineChartProps) {
  const t = useTranslations("common");
  const locale = useLocale();
  const max = niceMax(Math.max(...data.map((d) => plotValue(d.figure.value))));
  const n = data.length;
  const x = (i: number) => (n === 1 ? 50 : (i / (n - 1)) * 100);
  const y = (v: number) => 100 - (v / max) * 100;
  const colWidth = n > 1 ? 100 / (n - 1) : 100;

  const segments = data.slice(1).flatMap((d, idx) => {
    const prev = data[idx];
    if (prev.figure.value === null || d.figure.value === null) return [];
    return [
      {
        key: d.label,
        x1: x(idx),
        y1: y(plotValue(prev.figure.value)),
        x2: x(idx + 1),
        y2: y(plotValue(d.figure.value)),
        estimate: prev.figure.estimate || d.figure.estimate,
      },
    ];
  });
  const hasEstimate = data.some((d) => d.figure.estimate);

  return (
    <figure className={cx(styles.figure, className)}>
      <div aria-hidden="true" className={styles.plotWrap}>
        <div className={styles.yAxis} style={{ height }}>
          {[1, 0.5, 0].map((f) => (
            <span key={f} style={{ top: `${y(max * f)}%` }}>
              {formatCount(max * f, locale)}
            </span>
          ))}
        </div>
        <div>
          <div className={styles.plot} style={{ height }}>
            {[1, 0.5, 0].map((f) => (
              <span key={f} className={styles.grid} style={{ top: `${y(max * f)}%` }} />
            ))}
            {data.map((d, i) =>
              d.figure.estimate ? (
                <span
                  key={d.label}
                  className={styles.hatch}
                  style={{
                    left: `${Math.max(0, x(i) - colWidth / 2)}%`,
                    width: `${Math.min(100, x(i) + colWidth / 2) - Math.max(0, x(i) - colWidth / 2)}%`,
                  }}
                />
              ) : null,
            )}
            <svg className={styles.lines} viewBox="0 0 100 100" preserveAspectRatio="none">
              {segments.map((s) => (
                <line
                  key={s.key}
                  x1={s.x1}
                  y1={s.y1}
                  x2={s.x2}
                  y2={s.y2}
                  stroke={s.estimate ? "var(--blue-400)" : "var(--blue-600)"}
                  strokeWidth={s.estimate ? 1.75 : 2}
                  strokeDasharray={s.estimate ? "4 4" : undefined}
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </svg>
            {data.map((d, i) =>
              d.figure.value === null ? null : (
                <span
                  key={d.label}
                  className={cx(styles.dot, d.figure.estimate && styles.dotEstimate)}
                  style={{ left: `${x(i)}%`, top: `${y(plotValue(d.figure.value))}%` }}
                />
              ),
            )}
          </div>
          <div className={styles.xAxis}>
            {data.map((d, i) => (
              <span key={d.label} style={{ left: `${x(i)}%` }}>
                {d.label}
              </span>
            ))}
          </div>
        </div>
      </div>
      <DataTable title={title} rows={data} />
      <figcaption className={cx(styles.legend, styles.caption)}>
        <span>
          <i className={cx(styles.swatch, styles.swLine)} />
          {t("approved")}
        </span>
        {hasEstimate ? (
          <span>
            <i className={cx(styles.swatch, styles.swEstimate)} />
            {t("notesEstimateChart")}
          </span>
        ) : null}
        {caption}
      </figcaption>
    </figure>
  );
}
