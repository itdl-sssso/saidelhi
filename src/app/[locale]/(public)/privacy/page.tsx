import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PrivacyView } from "@/features/privacy/PrivacyView";
import { initLocale } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await initLocale();
  const t = await getTranslations({ locale, namespace: "privacy" });
  return { title: t("metaTitle"), description: t("lead") };
}

// Static content: the notice changes only with a new version of this page.
export default async function PrivacyPage() {
  await initLocale();
  return <PrivacyView />;
}
