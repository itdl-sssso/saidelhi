import { ogContentType, ogLocale, ogSize, sectionOg } from "@/lib/og";
import { getGalleryAlbum } from "@/features/public/data";
import { formatDate, tx } from "@/lib/format";

export const alt = "Sri Sathya Sai Seva Organisation, Delhi NCR";
export const size = ogSize;
export const contentType = ogContentType;

export default async function Image({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const l = ogLocale(locale);
  const a = await getGalleryAlbum(slug);
  // The section union in src/lib/og has no "gallery" yet; the `og.gallery` message exists (lead: widen the type).
  return sectionOg(locale, "gallery", a ? { title: tx(a.title, l), sub: formatDate(a.date, l) } : null);
}
