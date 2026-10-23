import { PageSkeleton, TwoColSkeleton } from "@/features/public/skeletons";

export default function Loading() {
  return (
    <PageSkeleton>
      <TwoColSkeleton />
    </PageSkeleton>
  );
}
