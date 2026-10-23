import { SectionPlaceholder, sectionMetadata } from "@/features/admin/SectionPlaceholder";

export const generateMetadata = () => sectionMetadata("migration");

export default function Page() {
  return <SectionPlaceholder slug="migration" />;
}
