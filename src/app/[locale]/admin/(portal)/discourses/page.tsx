import { SectionPlaceholder, sectionMetadata } from "@/features/admin/SectionPlaceholder";

export const generateMetadata = () => sectionMetadata("discourses");

export default function Page() {
  return <SectionPlaceholder slug="discourses" />;
}
