import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { HomeSections } from "@/features/home/HomeSections";
import { LotusJourney } from "@/features/home/LotusJourney";
import { getCentres, getHome } from "@/features/public/data";
import { initLocale } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await initLocale();
  const t = await getTranslations({ locale, namespace: "home" });
  return { title: t("metaTitle") };
}

// Spec 01. Data is cached (tags home/events/impact/articles/centres), so the whole page
// is part of the static shell and revalidates on those tags.
export default async function HomePage() {
  await initLocale();
  const [data, centres] = await Promise.all([getHome(), getCentres()]);
  return (
    <>
      <LotusJourney />
      <HomeSections data={data} centres={centres} />
    </>
  );
}
