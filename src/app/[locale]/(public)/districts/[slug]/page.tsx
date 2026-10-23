import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { DistrictView } from "@/features/district/DistrictView";
import { getDistrict } from "@/features/public/data";
import Loading from "./loading";
import { initLocale } from "@/i18n/server";
import { tx } from "@/lib/format";

type Props = PageProps<"/[locale]/districts/[slug]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await initLocale();
  const { slug } = await params;
  const data = await getDistrict(slug);
  if (!data) {
    const t = await getTranslations({ locale, namespace: "errors" });
    return { title: t("notFoundTitle") };
  }
  const t = await getTranslations({ locale, namespace: "district" });
  const name = t("districtName", { name: tx(data.district.name, locale) });
  return { title: name, description: t("introFallback", { count: data.samithiCount }) };
}

async function DistrictContent({ params }: Props) {
  await initLocale();
  const { slug } = await params;
  const data = await getDistrict(slug);
  if (!data) notFound();
  return <DistrictView data={data} />;
}

export default function DistrictPage(props: Props) {
  return (
    <Suspense fallback={<Loading />}>
      <DistrictContent {...props} />
    </Suspense>
  );
}
