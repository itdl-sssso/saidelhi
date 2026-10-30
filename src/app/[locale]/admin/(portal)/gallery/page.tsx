import { getTranslations } from "next-intl/server";
import { initLocale } from "@/i18n/server";
import { GalleryPage } from "@/features/admin/gallery/GalleryPage";
import { NoAccess } from "@/features/admin/kit";
import { requirePortal } from "@/features/admin/server";
import { Streamed } from "@/features/admin/Streamed";

export async function generateMetadata() {
  const locale = await initLocale();
  const t = await getTranslations({ locale, namespace: "admin.gallery" });
  return { title: t("title") };
}

async function Content() {
  const { session } = await requirePortal("/admin/gallery");
  const perms = session.actor.permissions;
  const canReview = perms.has("gallery.review");
  const canUpload = perms.has("gallery.upload");
  if (!canReview && !canUpload) return <NoAccess />;
  return <GalleryPage canReview={canReview} canUpload={canUpload} />;
}

export default function Page() {
  return (
    <Streamed>
      <Content />
    </Streamed>
  );
}
