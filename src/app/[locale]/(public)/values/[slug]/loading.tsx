import { CardGridSkeleton, PageSkeleton } from "@/features/public/skeletons";

export default function Loading() {
  return (
    <PageSkeleton>
      <CardGridSkeleton count={3} />
    </PageSkeleton>
  );
}
