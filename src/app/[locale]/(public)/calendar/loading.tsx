import { PageSkeleton, SkeletonRows } from "@/features/public/skeletons";

export default function Loading() {
  return (
    <PageSkeleton crumbs={false}>
      <SkeletonRows rows={6} />
    </PageSkeleton>
  );
}
