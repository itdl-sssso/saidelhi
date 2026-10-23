import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { ArticleCategoryFilter } from "@/contract";
import { NewsView } from "@/features/news/NewsView";
import { getArticles } from "@/features/public/data";
import Loading from "./loading";
import { initLocale } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await initLocale();
  const t = await getTranslations({ locale, namespace: "news" });
  return { title: t("metaTitle"), description: t("lead") };
}

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

async function NewsContent({ searchParams }: PageProps<"/[locale]/news">) {
  await initLocale();
  const sp = await searchParams;
  // An unknown category falls back to "all"; a bad page number to the first page.
  const c = ArticleCategoryFilter.safeParse(first(sp.c)).data ?? "all";
  const page = Math.max(1, Number.parseInt(first(sp.page) ?? "1", 10) || 1);
  const result = await getArticles(c, page);
  return <NewsView c={c} result={result} />;
}

export default function NewsPage(props: PageProps<"/[locale]/news">) {
  return (
    <Suspense fallback={<Loading />}>
      <NewsContent {...props} />
    </Suspense>
  );
}
