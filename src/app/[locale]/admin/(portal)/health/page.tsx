import { SectionPlaceholder, sectionMetadata } from "@/features/admin/SectionPlaceholder";

export const generateMetadata = () => sectionMetadata("health");

export default function Page() {
  return <SectionPlaceholder slug="health" />;
}
