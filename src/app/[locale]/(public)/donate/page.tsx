import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { DonateView } from "@/features/donate/DonateView";
import { initLocale } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await initLocale();
  const t = await getTranslations({ locale, namespace: "donate" });
  return { title: t("metaTitle"), description: t("lead") };
}

// Static content: bank details change only with a code change.
export default async function DonatePage() {
  await initLocale();
  return <DonateView />;
}
