import { SectionPlaceholder, sectionMetadata } from "@/features/admin/SectionPlaceholder";

export const generateMetadata = () => sectionMetadata("follow-up");

export default function Page() {
  return <SectionPlaceholder slug="follow-up" />;
}
