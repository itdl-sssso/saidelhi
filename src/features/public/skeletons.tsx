import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { cx } from "@/ui/cx";
import { Skeleton, SkeletonCard, SkeletonKpi, SkeletonRows } from "@/ui/Skeleton";
import styles from "./public.module.css";
import sk from "./skeletons.module.css";

/** Page-level loading shell: hero shaped like the final one, then the page's body skeleton. */
export function PageSkeleton({ crumbs = true, lead = true, children }: { crumbs?: boolean; lead?: boolean; children: ReactNode }) {
  const t = useTranslations("common");
  return (
    <div aria-busy="true">
      <p className="sr-only" role="status">
        {t("loading")}
      </p>
      <section className={styles.hero}>
        <div className={cx(styles.wrap, styles.heroBody)} aria-hidden="true">
          {crumbs ? <Skeleton width={180} height={12} /> : null}
          <Skeleton width={140} height={28} radius={999} />
          <Skeleton width="min(560px, 85%)" height={40} radius={8} />
          {lead ? <Skeleton width="min(480px, 70%)" height={18} /> : null}
        </div>
      </section>
      <section className={styles.section}>
        <div className={styles.wrap}>{children}</div>
      </section>
    </div>
  );
}

export function KpiGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className={sk.kpis}>
      {Array.from({ length: count }, (_, i) => (
        <SkeletonKpi key={i} />
      ))}
    </div>
  );
}

export function CardGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className={sk.cards}>
      {Array.from({ length: count }, (_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function TwoColSkeleton() {
  return (
    <div className={sk.twoCol}>
      <SkeletonRows rows={4} />
      <div className={sk.stack}>
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );
}

export { SkeletonRows };
