import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { AboutView } from "@/features/about/AboutView";
import { getDistricts } from "@/features/public/data";
import Loading from "./loading";
import { initLocale } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await initLocale();
  const t = await getTranslations({ locale, namespace: "about" });
  return { title: t("metaTitle"), description: t("metaDescription") };
}

async function AboutContent() {
  await initLocale();
  const districts = await getDistricts();
  return <AboutView districts={districts} />;
}

export default function AboutPage() {
  return (
    <Suspense fallback={<Loading />}>
      <AboutContent />
    </Suspense>
  );
}
