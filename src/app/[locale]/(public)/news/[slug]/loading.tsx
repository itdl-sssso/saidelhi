import { PageSkeleton, SkeletonRows } from "@/features/public/skeletons";

export default function Loading() {
  return (
    <PageSkeleton>
      <SkeletonRows rows={6} />
    </PageSkeleton>
  );
}
