import { CardGridSkeleton, KpiGridSkeleton, PageSkeleton } from "@/features/public/skeletons";

export default function Loading() {
  return (
    <PageSkeleton crumbs={false}>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-10)" }}>
        <KpiGridSkeleton />
        <CardGridSkeleton count={3} />
      </div>
    </PageSkeleton>
  );
}
