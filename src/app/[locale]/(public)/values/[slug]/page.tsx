import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { VALUE_ORDER, ValueSlug } from "@/contract";
import { getValue } from "@/features/public/data";
import { ValueView } from "@/features/values/ValueView";
import Loading from "./loading";
import { initLocale } from "@/i18n/server";

type Props = PageProps<"/[locale]/values/[slug]">;

export function generateStaticParams() {
  return VALUE_ORDER.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await initLocale();
  const { slug } = await params;
  const parsed = ValueSlug.safeParse(slug);
  if (!parsed.success) {
    const t = await getTranslations({ locale, namespace: "errors" });
    return { title: t("notFoundTitle") };
  }
  const th = await getTranslations({ locale, namespace: "home" });
  const t = await getTranslations({ locale, namespace: "valuePage" });
  const k = parsed.data;
  return {
    title: `${th(`values.${k}.name`)} (${th(`values.${k}.gloss`)})`,
    description: `${t("metaSuffix")}. ${th(`values.${k}.body`)}`,
  };
}

async function ValueContent({ params }: Props) {
  await initLocale();
  const { slug } = await params;
  const parsed = ValueSlug.safeParse(slug);
  if (!parsed.success) notFound();
  const data = await getValue(parsed.data);
  if (!data) notFound();
  return <ValueView data={data} />;
}

export default function ValuePage(props: Props) {
  return (
    <Suspense fallback={<Loading />}>
      <ValueContent {...props} />
    </Suspense>
  );
}
