import { SectionPlaceholder, sectionMetadata } from "@/features/admin/SectionPlaceholder";

export const generateMetadata = () => sectionMetadata("centres");

export default function Page() {
  return <SectionPlaceholder slug="centres" />;
}
