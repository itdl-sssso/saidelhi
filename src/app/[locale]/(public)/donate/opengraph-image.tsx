import { getTranslations } from "next-intl/server";
import { ogContentType, ogLocale, ogSize, sectionOg } from "@/lib/og";

export const alt = "Sri Sathya Sai Seva Organisation, Delhi NCR";
export const size = ogSize;
export const contentType = ogContentType;

export default async function Image({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale: ogLocale(locale), namespace: "donate" });
  return sectionOg(locale, "donate", { title: t("title"), sub: t("ogSub") });
}
