import { SectionPlaceholder, sectionMetadata } from "@/features/admin/SectionPlaceholder";

export const generateMetadata = () => sectionMetadata("uploads");

export default function Page() {
  return <SectionPlaceholder slug="uploads" />;
}
