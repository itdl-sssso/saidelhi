import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getDiscourse } from "@/features/discourses/data";
import { DiscourseView, type ReadLang } from "@/features/discourses/DiscourseView";
import Loading from "../loading";
import { initLocale } from "@/i18n/server";
import { tx } from "@/lib/format";

type Props = PageProps<"/[locale]/discourses/[slug]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await initLocale();
  const { slug } = await params;
  const d = await getDiscourse(slug);
  if (!d) {
    const t = await getTranslations({ locale, namespace: "errors" });
    return { title: t("notFoundTitle") };
  }
  return { title: tx(d.title, locale), description: tx(d.why, locale) || undefined };
}

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

async function DiscourseContent({ params, searchParams }: Props) {
  const locale = await initLocale();
  const { slug } = await params;
  const sp = await searchParams;
  const d = await getDiscourse(slug);
  if (!d) notFound(); // unknown slug, unpublished, or flag off
  const l = first(sp.lang);
  const read: ReadLang = l === "en" || l === "hi" || l === "both" ? l : locale;
  return <DiscourseView d={d} read={read} />;
}

export default function DiscoursePage(props: Props) {
  return (
    <Suspense fallback={<Loading />}>
      <DiscourseContent {...props} />
    </Suspense>
  );
}
