import { ogContentType, ogLocale, ogSize, sectionOg } from "@/lib/og";
import { getArticle } from "@/features/public/data";
import { tx } from "@/lib/format";

export const alt = "Sri Sathya Sai Seva Organisation, Delhi NCR";
export const size = ogSize;
export const contentType = ogContentType;

export default async function Image({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const a = await getArticle(slug);
  return sectionOg(locale, "news", a ? { title: tx(a.title, ogLocale(locale)) } : null);
}
