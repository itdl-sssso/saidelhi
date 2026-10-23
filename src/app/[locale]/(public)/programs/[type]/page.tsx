import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { SevaType } from "@/contract";
import { getProgram } from "@/features/public/data";
import { ProgramView } from "@/features/programs/ProgramView";
import Loading from "./loading";
import { initLocale } from "@/i18n/server";
import { tx } from "@/lib/format";

type Props = PageProps<"/[locale]/programs/[type]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await initLocale();
  const { type } = await params;
  const parsed = SevaType.safeParse(type);
  const program = parsed.success ? await getProgram(parsed.data) : null;
  if (!program) {
    const t = await getTranslations({ locale, namespace: "errors" });
    return { title: t("notFoundTitle") };
  }
  const t = await getTranslations({ locale, namespace: "program" });
  return { title: tx(program.label, locale), description: t(`lead.${program.sevaType}`) };
}

async function ProgramContent({ params }: Props) {
  await initLocale();
  const { type } = await params;
  const parsed = SevaType.safeParse(type);
  if (!parsed.success) notFound();
  const program = await getProgram(parsed.data);
  if (!program) notFound();
  return <ProgramView program={program} />;
}

export default function ProgramPage(props: Props) {
  return (
    <Suspense fallback={<Loading />}>
      <ProgramContent {...props} />
    </Suspense>
  );
}
