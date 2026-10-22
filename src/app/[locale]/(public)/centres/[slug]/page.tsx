import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { CentreView } from "@/features/centre/CentreView";
import { getCentre } from "@/features/public/data";
import Loading from "./loading";
import { initLocale } from "@/i18n/server";
import { tx } from "@/lib/format";

export async function generateMetadata({ params }: PageProps<"/[locale]/centres/[slug]">): Promise<Metadata> {
  const locale = await initLocale();
  const { slug } = await params;
  const centre = await getCentre(slug);
  if (!centre) {
    const t = await getTranslations({ locale, namespace: "errors" });
    return { title: t("notFoundTitle") };
  }
  const t = await getTranslations({ locale, namespace: "centre" });
  return { title: tx(centre.name, locale), description: `${tx(centre.address, locale)}. ${t("lead")}` };
}

async function CentreContent({ params }: PageProps<"/[locale]/centres/[slug]">) {
  await initLocale();
  const { slug } = await params;
  const centre = await getCentre(slug);
  if (!centre) notFound();
  return <CentreView centre={centre} />;
}

export default function CentrePage(props: PageProps<"/[locale]/centres/[slug]">) {
  return (
    <Suspense fallback={<Loading />}>
      <CentreContent {...props} />
    </Suspense>
  );
}
