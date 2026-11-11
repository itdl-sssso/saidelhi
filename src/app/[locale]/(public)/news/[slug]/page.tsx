import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArticleView } from "@/features/news/ArticleView";
import { getArticle } from "@/features/public/data";
import Loading from "./loading";
import { initLocale } from "@/i18n/server";
import { tx } from "@/lib/format";
import { metaDescription, pageAlternates } from "@/features/seo/meta";
import { JsonLd } from "@/features/seo/JsonLd";
import { articleSchema } from "@/features/seo/schema";
import { env } from "@/server/env";

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
    description: metaDescription(tx(article.summary, locale)),
    alternates: pageAlternates(locale, `/news/${encodeURIComponent(slug)}`),
    openGraph: article.cover ? { images: [article.cover.url] } : undefined,
  };
}

async function ArticleContent({ params }: Props) {
  const locale = await initLocale();
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) notFound();
  const tm = await getTranslations({ locale, namespace: "meta" });
  return (
    <>
      <JsonLd data={articleSchema(article, { base: env().APP_URL, locale, orgName: `${tm("orgName")}, ${tm("region")}` })} />
      <ArticleView article={article} />
    </>
  );
}

export default function ArticlePage(props: Props) {
  return (
    <Suspense fallback={<Loading />}>
      <ArticleContent {...props} />
    </Suspense>
  );
}
