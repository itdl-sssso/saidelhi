import { getTranslations } from "next-intl/server";
import { initLocale } from "@/i18n/server";
import { AlbumEditor } from "@/features/admin/gallery/AlbumEditor";
import { NoAccess } from "@/features/admin/kit";
import { requirePortal } from "@/features/admin/server";
import { Streamed } from "@/features/admin/Streamed";

export async function generateMetadata() {
  const locale = await initLocale();
  const t = await getTranslations({ locale, namespace: "admin.gallery" });
  return { title: t("albumTitleMeta") };
}

async function Content({ params }: PageProps<"/[locale]/admin/gallery/albums/[id]">) {
  const { id } = await params;
  const { session } = await requirePortal(`/admin/gallery/albums/${id}`);
  const perms = session.actor.permissions;
  const canReview = perms.has("gallery.review");
  const canUpload = perms.has("gallery.upload");
  if (!canReview && !canUpload) return <NoAccess />;
  return <AlbumEditor id={id} canReview={canReview} canUpload={canUpload} />;
}

export default function Page(props: PageProps<"/[locale]/admin/gallery/albums/[id]">) {
  return (
    <Streamed>
      <Content {...props} />
    </Streamed>
  );
}
