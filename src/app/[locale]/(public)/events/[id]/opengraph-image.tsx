import { ogContentType, ogLocale, ogSize, sectionOg } from "@/lib/og";
import { getEvent } from "@/features/public/data";
import { formatDate, pickText } from "@/lib/format";

export const alt = "Sri Sathya Sai Seva Organisation, Delhi NCR";
export const size = ogSize;
export const contentType = ogContentType;

export default async function Image({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  const e = await getEvent(id);
  const l = ogLocale(locale);
  return sectionOg(locale, "events", e ? { title: pickText(e.title, l).text, sub: `${formatDate(e.startsAt, l)} · ${e.venue.name}` } : null);
}
