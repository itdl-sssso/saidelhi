import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AlbumView } from "@/features/gallery/AlbumView";
import { getGalleryAlbum } from "@/features/public/data";
import Loading from "./loading";
import { initLocale } from "@/i18n/server";
import { tx } from "@/lib/format";

type Props = PageProps<"/[locale]/gallery/[slug]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await initLocale();
  const { slug } = await params;
  const album = await getGalleryAlbum(slug);
  if (!album) {
    const t = await getTranslations({ locale, namespace: "errors" });
    return { title: t("notFoundTitle") };
  }
  const t = await getTranslations({ locale, namespace: "gallery" });
  return {
    title: tx(album.title, locale),
    description: t("photosN", { count: album.count }),
    openGraph: { images: [album.cover.src] },
  };
}

async function AlbumContent({ params }: Props) {
  await initLocale();
  const { slug } = await params;
  const album = await getGalleryAlbum(slug);
  if (!album) notFound();
  return <AlbumView album={album} />;
}

export default function AlbumPage(props: Props) {
  return (
    <Suspense fallback={<Loading />}>
      <AlbumContent {...props} />
    </Suspense>
  );
}
