import { ogContentType, ogLocale, ogSize, sectionOg } from "@/lib/og";
import { getDiscourse } from "@/features/discourses/data";
import { tx } from "@/lib/format";

export const alt = "Sri Sathya Sai Seva Organisation, Delhi NCR";
export const size = ogSize;
export const contentType = ogContentType;

export default async function Image({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const d = await getDiscourse(slug);
  return sectionOg(locale, "discourses", d ? { title: tx(d.title, ogLocale(locale)), sub: d.date } : null);
}
