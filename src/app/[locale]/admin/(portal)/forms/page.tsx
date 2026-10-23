import { SectionPlaceholder, sectionMetadata } from "@/features/admin/SectionPlaceholder";

export const generateMetadata = () => sectionMetadata("forms");

export default function Page() {
  return <SectionPlaceholder slug="forms" />;
}
