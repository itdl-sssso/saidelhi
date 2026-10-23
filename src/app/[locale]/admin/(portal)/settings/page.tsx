import { SectionPlaceholder, sectionMetadata } from "@/features/admin/SectionPlaceholder";

export const generateMetadata = () => sectionMetadata("settings");

export default function Page() {
  return <SectionPlaceholder slug="settings" />;
}
