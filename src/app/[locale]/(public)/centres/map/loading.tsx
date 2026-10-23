import { PageSkeleton, TwoColSkeleton } from "@/features/public/skeletons";

export default function Loading() {
  return (
    <PageSkeleton lead={false}>
      <TwoColSkeleton />
    </PageSkeleton>
  );
}
