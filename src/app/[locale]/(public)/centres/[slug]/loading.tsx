import { KpiGridSkeleton, PageSkeleton, SkeletonRows } from "@/features/public/skeletons";

export default function Loading() {
  return (
    <PageSkeleton>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-10)" }}>
        <SkeletonRows rows={4} />
        <KpiGridSkeleton />
      </div>
    </PageSkeleton>
  );
}
