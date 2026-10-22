import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { cx } from "../cx";
import styles from "./Skeleton.module.css";

export type SkeletonProps = {
  width?: number | string;
  height?: number;
  radius?: number;
  className?: string;
};

export function Skeleton({ width = "100%", height = 14, radius = 6, className }: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      className={cx(styles.bone, className)}
      style={{ width, height, borderRadius: radius }}
    />
  );
}

function Busy({ className, children }: { className: string; children: ReactNode }) {
  const t = useTranslations("common");
  return (
    <div className={className} aria-busy="true" role="status" aria-label={t("loading")}>
      {children}
    </div>
  );
}

export function SkeletonKpi() {
  return (
    <Busy className={styles.kpi}>
      <Skeleton width="60%" />
      <Skeleton width="45%" height={34} radius={8} />
      <div className={styles.foot}>
        <Skeleton width="35%" height={12} />
        <Skeleton width={96} height={28} />
      </div>
    </Busy>
  );
}

export function SkeletonCard() {
  return (
    <Busy className={styles.card}>
      <Skeleton width={44} height={44} radius={10} />
      <Skeleton width="70%" height={20} />
      <Skeleton />
      <Skeleton width="85%" />
    </Busy>
  );
}

export function SkeletonRows({ rows = 4 }: { rows?: number }) {
  return (
    <Busy className={styles.rows}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className={styles.row}>
          <Skeleton height={40} radius={10} />
          <div className={styles.stack}>
            <Skeleton width={`${70 - i * 8}%`} />
            <Skeleton width="40%" height={10} />
          </div>
          <Skeleton height={26} radius={999} />
        </div>
      ))}
    </Busy>
  );
}
