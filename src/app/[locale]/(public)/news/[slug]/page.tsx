import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArticleView } from "@/features/news/ArticleView";
import { getArticle } from "@/features/public/data";
import Loading from "./loading";
import { initLocale } from "@/i18n/server";
import { tx } from "@/lib/format";

type Props = PageProps<"/[locale]/news/[slug]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await initLocale();
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) {
    const t = await getTranslations({ locale, namespace: "errors" });
    return { title: t("notFoundTitle") };
  }
  return {
    title: tx(article.title, locale),
    description: tx(article.summary, locale),
    openGraph: article.cover ? { images: [article.cover.url] } : undefined,
  };
}

async function ArticleContent({ params }: Props) {
  await initLocale();
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) notFound();
  return <ArticleView article={article} />;
}

export default function ArticlePage(props: Props) {
  return (
    <Suspense fallback={<Loading />}>
      <ArticleContent {...props} />
    </Suspense>
  );
}
