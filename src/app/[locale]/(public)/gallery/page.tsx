import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { GalleryKind } from "@/contract";
import { GalleryView } from "@/features/gallery/GalleryView";
import { getGalleryAlbums } from "@/features/public/data";
import Loading from "./loading";
import { initLocale } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await initLocale();
  const t = await getTranslations({ locale, namespace: "gallery" });
  return { title: t("metaTitle"), description: t("lead") };
}

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

async function GalleryContent({ searchParams }: PageProps<"/[locale]/gallery">) {
  await initLocale();
  const sp = await searchParams;
  // Unknown filters fall back to "all"; a bad page number to the first page.
  const kind = GalleryKind.safeParse(first(sp.kind)).data;
  const y = Number.parseInt(first(sp.year) ?? "", 10);
  const year = y >= 2000 && y <= 2100 ? y : undefined;
  const page = Math.max(1, Number.parseInt(first(sp.page) ?? "1", 10) || 1);
  const result = await getGalleryAlbums({ page, pageSize: 12, year, kind });
  return <GalleryView result={result} year={year} kind={kind} />;
}

export default function GalleryPage(props: PageProps<"/[locale]/gallery">) {
  return (
    <Suspense fallback={<Loading />}>
      <GalleryContent {...props} />
    </Suspense>
  );
}
