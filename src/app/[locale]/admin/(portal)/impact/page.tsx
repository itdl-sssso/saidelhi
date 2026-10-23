import { SectionPlaceholder, sectionMetadata } from "@/features/admin/SectionPlaceholder";

export const generateMetadata = () => sectionMetadata("impact");

export default function Page() {
  return <SectionPlaceholder slug="impact" />;
}
