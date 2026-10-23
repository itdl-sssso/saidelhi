import type { ReactNode } from "react";
import { cx } from "../cx";
import styles from "./Heatmap.module.css";

export type HeatmapRow = { id: string; label: ReactNode; href?: ReactNode; cells: Array<number | null>; muted?: boolean };

export type HeatmapProps = {
  /** Accessible table caption. */
  caption: string;
  columns: string[];
  rows: HeatmapRow[];
  /** Text for a cell with no data, e.g. "No events". */
  emptyText: string;
  /** Legend labels, best to worst. */
  legend: { good: string; ok: string; low: string; poor: string };
  /** Header of the first column. */
  rowHeader: string;
  /** Format a cell's number (default `n%`). */
  format?: (n: number) => string;
  /** Columns shown on phones (the latest N). */
  phoneColumns?: number;
  className?: string;
};

const level = (n: number) => (n >= 90 ? "good" : n >= 70 ? "ok" : n >= 40 ? "low" : "poor");

/** Month-by-unit grid. A real table (row/column headers); the value is always printed, colour is only a hint. */
export function Heatmap({ caption, columns, rows, emptyText, legend, rowHeader, format = (n) => `${Math.round(n)}%`, phoneColumns = 3, className }: HeatmapProps) {
  const hiddenOnPhone = (i: number) => i < columns.length - phoneColumns;
  return (
    <div className={cx(styles.root, className)}>
      <div className={styles.scroll}>
        <table className={styles.table}>
          <caption className={styles.caption}>{caption}</caption>
          <thead>
            <tr>
              <th scope="col" className={styles.rowHead}>
                {rowHeader}
              </th>
              {columns.map((c, i) => (
                <th key={c} scope="col" className={cx(styles.colHead, hiddenOnPhone(i) && styles.phoneHide)}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className={cx(r.muted && styles.muted)}>
                <th scope="row" className={styles.rowHead}>
                  {r.href ?? r.label}
                </th>
                {columns.map((c, i) => {
                  const v = r.cells[i] ?? null;
                  return (
                    <td key={c} className={cx(styles.cell, hiddenOnPhone(i) && styles.phoneHide)} data-level={v === null ? "none" : level(v)}>
                      {v === null ? <span title={emptyText} aria-label={emptyText}>–</span> : format(v)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className={styles.legend} aria-label={caption}>
        {(["good", "ok", "low", "poor"] as const).map((k) => (
          <li key={k}>
            <i data-level={k} aria-hidden="true" />
            {legend[k]}
          </li>
        ))}
        <li>
          <i data-level="none" aria-hidden="true" />
          {emptyText}
        </li>
      </ul>
    </div>
  );
}
