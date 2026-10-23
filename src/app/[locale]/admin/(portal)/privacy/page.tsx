import { SectionPlaceholder, sectionMetadata } from "@/features/admin/SectionPlaceholder";

export const generateMetadata = () => sectionMetadata("privacy");

export default function Page() {
  return <SectionPlaceholder slug="privacy" />;
}
