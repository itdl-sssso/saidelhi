import { getTranslations } from "next-intl/server";
import { ogContentType, ogLocale, ogSize, sectionOg } from "@/lib/og";
import { getDistrict } from "@/features/public/data";
import { tx } from "@/lib/format";

export const alt = "Sri Sathya Sai Seva Organisation, Delhi NCR";
export const size = ogSize;
export const contentType = ogContentType;

export default async function Image({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const d = await getDistrict(slug);
  const l = ogLocale(locale);
  const t = await getTranslations({ locale: l, namespace: "district" });
  return sectionOg(locale, "districts", d ? { title: t("districtName", { name: tx(d.district.name, l) }) } : null);
}
