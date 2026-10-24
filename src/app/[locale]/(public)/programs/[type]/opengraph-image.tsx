import { ogContentType, ogLocale, ogSize, sectionOg } from "@/lib/og";
import { SevaType } from "@/contract";
import { getProgram } from "@/features/public/data";
import { tx } from "@/lib/format";

export const alt = "Sri Sathya Sai Seva Organisation, Delhi NCR";
export const size = ogSize;
export const contentType = ogContentType;

export default async function Image({ params }: { params: Promise<{ locale: string; type: string }> }) {
  const { locale, type } = await params;
  const p = SevaType.safeParse(type);
  const program = p.success ? await getProgram(p.data) : null;
  return sectionOg(locale, "programs", program ? { title: tx(program.label, ogLocale(locale)) } : null);
}
