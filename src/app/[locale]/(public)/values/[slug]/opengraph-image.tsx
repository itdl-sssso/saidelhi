import { getTranslations } from "next-intl/server";
import { ogContentType, ogLocale, ogSize, sectionOg } from "@/lib/og";
import { ValueSlug } from "@/contract";

export const alt = "Sri Sathya Sai Seva Organisation, Delhi NCR";
export const size = ogSize;
export const contentType = ogContentType;

export default async function Image({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const p = ValueSlug.safeParse(slug);
  if (!p.success) return sectionOg(locale, "values", null);
  const th = await getTranslations({ locale: ogLocale(locale), namespace: "home" });
  return sectionOg(locale, "values", { title: th(`values.${p.data}.name`), sub: th(`values.${p.data}.gloss`) });
}
