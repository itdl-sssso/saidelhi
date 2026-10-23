import { SectionPlaceholder, sectionMetadata } from "@/features/admin/SectionPlaceholder";

export const generateMetadata = () => sectionMetadata("reports");

export default function Page() {
  return <SectionPlaceholder slug="reports" />;
}
