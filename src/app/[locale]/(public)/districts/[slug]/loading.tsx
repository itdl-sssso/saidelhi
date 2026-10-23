import { CardGridSkeleton, KpiGridSkeleton, PageSkeleton } from "@/features/public/skeletons";

export default function Loading() {
  return (
    <PageSkeleton>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-10)" }}>
        <KpiGridSkeleton />
        <CardGridSkeleton count={2} />
      </div>
    </PageSkeleton>
  );
}
