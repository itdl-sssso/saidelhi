import { ogContentType, ogLocale, ogSize, sectionOg } from "@/lib/og";
import { getCentre } from "@/features/public/data";
import { tx } from "@/lib/format";

export const alt = "Sri Sathya Sai Seva Organisation, Delhi NCR";
export const size = ogSize;
export const contentType = ogContentType;

export default async function Image({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const c = await getCentre(slug);
  const l = ogLocale(locale);
  return sectionOg(locale, "centres", c ? { title: tx(c.name, l), sub: tx(c.address, l) } : null);
}
