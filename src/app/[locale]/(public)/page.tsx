import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { HomeSections } from "@/features/home/HomeSections";
import { LotusJourney } from "@/features/home/LotusJourney";
import { getDiscourseFlag } from "@/features/discourses/data";
import { getHomeDiscourses, getUpcomingBhajans } from "@/features/home/data";
import { getHomeStories } from "@/features/home/stories";
import { getCentres, getHome, getWaOutreachFlag } from "@/features/public/data";
import { initLocale } from "@/i18n/server";
import { pageAlternates } from "@/features/seo/meta";
import { JsonLd } from "@/features/seo/JsonLd";
import { organizationSchema } from "@/features/seo/schema";
import { env } from "@/server/env";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await initLocale();
  const t = await getTranslations({ locale, namespace: "home" });
  return { title: t("metaTitle"), alternates: pageAlternates(locale, "/") };
}

// Spec 01. Data is cached (tags home/events/impact/articles/centres), so the page is part of
// the static shell and revalidates on those tags. One dynamic hole: the random discourse picks.
export default async function HomePage() {
  const locale = await initLocale();
  const tm = await getTranslations({ locale, namespace: "meta" });
  const [data, centres, stories, discourses, waOutreach, bhajans] = await Promise.all([
    getHome(),
    getCentres(),
    getHomeStories(),
    getDiscourseFlag(),
    getWaOutreachFlag(),
    getUpcomingBhajans(),
  ]);
  const discoursePicks = discourses ? await getHomeDiscourses() : [];
  return (
    <>
      <JsonLd
        data={organizationSchema({
          base: env().APP_URL,
          locale,
          name: `${tm("orgName")}, ${tm("region")}`,
          alternateName: tm("siteName"),
          description: tm("description"),
          areaServed: tm("region"),
        })}
      />
      <LotusJourney />
      <HomeSections
        data={data}
        centres={centres}
        stories={stories}
        discourses={discourses}
        discoursePicks={discoursePicks}
        bhajans={bhajans}
        waOutreach={waOutreach}
      />
    </>
  );
}
