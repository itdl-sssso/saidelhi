import { SectionPlaceholder, sectionMetadata } from "@/features/admin/SectionPlaceholder";

export const generateMetadata = () => sectionMetadata("partners");

export default function Page() {
  return <SectionPlaceholder slug="partners" />;
}
