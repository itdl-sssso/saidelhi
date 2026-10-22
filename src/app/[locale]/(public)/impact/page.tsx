import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ImpactPeriod } from "@/contract";
import { ImpactView } from "@/features/impact/ImpactView";
import { getImpact } from "@/features/public/data";
import Loading from "./loading";
import { initLocale } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await initLocale();
  const t = await getTranslations({ locale, namespace: "impact" });
  return { title: t("metaTitle"), description: t("lead") };
}

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

async function ImpactContent({ searchParams }: PageProps<"/[locale]/impact">) {
  await initLocale();
  const sp = await searchParams;
  // An unknown period falls back to "this year"; an unknown district is a 404.
  const period = ImpactPeriod.safeParse(first(sp.period)).data ?? "this_year";
  const rawDistrict = first(sp.district) || undefined;
  if (rawDistrict && !SLUG.test(rawDistrict)) notFound();
  const data = await getImpact(period, rawDistrict);
  if (!data) notFound();
  return <ImpactView data={data} />;
}

export default function ImpactPage(props: PageProps<"/[locale]/impact">) {
  return (
    <Suspense fallback={<Loading />}>
      <ImpactContent {...props} />
    </Suspense>
  );
}
