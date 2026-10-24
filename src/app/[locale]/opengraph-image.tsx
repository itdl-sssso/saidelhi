import { ogCache, ogContentType, ogLocale, ogSize, ogText, renderOg } from "@/lib/og";

export const alt = "Sri Sathya Sai Seva Organisation, Delhi NCR";
export const size = ogSize;
export const contentType = ogContentType;

export default async function Image({ params }: { params: Promise<{ locale: string }> }) {
  const locale = ogLocale((await params).locale);
  const { t, m } = await ogText(locale);
  return renderOg({ locale, orgName: m("orgName"), region: m("region"), tagline: t("tagline") }, ogCache);
}
