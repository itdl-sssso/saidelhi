import { SectionPlaceholder, sectionMetadata } from "@/features/admin/SectionPlaceholder";

export const generateMetadata = () => sectionMetadata("volunteers");

export default function Page() {
  return <SectionPlaceholder slug="volunteers" />;
}
