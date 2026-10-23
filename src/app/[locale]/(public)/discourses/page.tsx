import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { DiscourseTheme } from "@/contract";
import { getDiscourses } from "@/features/discourses/data";
import { DiscoursesView } from "@/features/discourses/DiscoursesView";
import Loading from "./loading";
import { initLocale } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await initLocale();
  const t = await getTranslations({ locale, namespace: "discourses" });
  return { title: t("metaTitle"), description: t("lead") };
}

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

async function DiscoursesContent({ searchParams }: PageProps<"/[locale]/discourses">) {
  await initLocale();
  const sp = await searchParams;
  // An unknown theme falls back to "all themes".
  const theme = DiscourseTheme.safeParse(first(sp.theme)).data;
  const q = (first(sp.q) ?? "").trim().slice(0, 80);
  const data = await getDiscourses({ theme, q: q || undefined });
  if (!data) notFound(); // flag off
  return <DiscoursesView data={data} theme={theme} q={q} />;
}

export default function DiscoursesPage(props: PageProps<"/[locale]/discourses">) {
  return (
    <Suspense fallback={<Loading />}>
      <DiscoursesContent {...props} />
    </Suspense>
  );
}
