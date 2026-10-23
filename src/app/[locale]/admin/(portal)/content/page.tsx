import { SectionPlaceholder, sectionMetadata } from "@/features/admin/SectionPlaceholder";

export const generateMetadata = () => sectionMetadata("content");

export default function Page() {
  return <SectionPlaceholder slug="content" />;
}
