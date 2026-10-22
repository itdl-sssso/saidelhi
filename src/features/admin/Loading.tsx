// Skeletons shaped like the portal pages (page head, KPI tiles / table rows), never a full-page spinner.
import { Skeleton, SkeletonKpi, SkeletonRows } from "@/ui/Skeleton";
import styles from "./Admin.module.css";

export function PortalLoading({ kpis = false }: { kpis?: boolean }) {
  return (
    <div className={styles.page}>
      <div className={styles.headT}>
        <Skeleton width={120} height={12} />
        <Skeleton width="45%" height={34} radius={8} />
        <Skeleton width="60%" height={14} />
      </div>
      {kpis ? (
        <div className={`${styles.grid} ${styles.g4}`}>
          {Array.from({ length: 4 }, (_, i) => (
            <SkeletonKpi key={i} />
          ))}
        </div>
      ) : null}
      <div className={styles.card}>
        <SkeletonRows />
      </div>
    </div>
  );
}
