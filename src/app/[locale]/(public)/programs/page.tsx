import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { Wing } from "@/contract";
import { getPrograms } from "@/features/public/data";
import { ProgramsView } from "@/features/programs/ProgramsView";
import Loading from "./loading";
import { initLocale } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await initLocale();
  const t = await getTranslations({ locale, namespace: "programs" });
  return { title: t("metaTitle"), description: t("lead") };
}

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

async function ProgramsContent({ searchParams }: PageProps<"/[locale]/programs">) {
  await initLocale();
  const sp = await searchParams;
  // An unknown wing shows every programme.
  const wing = Wing.safeParse(first(sp.wing)).data ?? null;
  const cards = await getPrograms(wing ?? undefined);
  return <ProgramsView wing={wing} cards={cards} />;
}

export default function ProgramsPage(props: PageProps<"/[locale]/programs">) {
  return (
    <Suspense fallback={<Loading />}>
      <ProgramsContent {...props} />
    </Suspense>
  );
}
