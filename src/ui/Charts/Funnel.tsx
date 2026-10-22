import { useTranslations } from "next-intl";
import { plotValue } from "../data/format";
import type { Figure } from "../data/types";
import { FigureValue } from "../Figure";
import { cx } from "../cx";
import styles from "./Charts.module.css";

export type FunnelStep = { label: string; figure: Figure };

export type FunnelProps = {
  steps: FunnelStep[];
  title: string;
  className?: string;
};

/** Stages such as registered → screened → referred. Unreported stages show "—", never a zero-width bar. */
export function Funnel({ steps, title, className }: FunnelProps) {
  const t = useTranslations("common");
  const max = Math.max(1, ...steps.map((s) => plotValue(s.figure.value)));
  return (
    <ol className={cx(styles.funnel, className)} aria-label={title}>
      {steps.map((s) => {
        const v = s.figure.value;
        return (
          <li key={s.label} className={styles.funnelRow}>
            <span className={styles.funnelLabel}>{s.label}</span>
            {v === null ? (
              <span className={cx(styles.funnelBar, styles.funnelNone)} aria-hidden="true">
                {t("notReported")}
              </span>
            ) : (
              <span
                aria-hidden="true"
                className={cx(styles.funnelBar, s.figure.estimate && styles.funnelEstimate)}
                style={{ width: `${Math.max((plotValue(v) / max) * 100, 4)}%` }}
              />
            )}
            <span className={styles.funnelValue}>
              <FigureValue value={v} inline />
            </span>
          </li>
        );
      })}
    </ol>
  );
}
