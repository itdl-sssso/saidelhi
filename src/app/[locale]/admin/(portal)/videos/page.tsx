import { getTranslations } from "next-intl/server";
import { initLocale } from "@/i18n/server";
import { NoAccess } from "@/features/admin/kit";
import { requirePortal } from "@/features/admin/server";
import { Streamed } from "@/features/admin/Streamed";
import { VideosPage } from "@/features/admin/videos/VideosPage";
import { videoUploadsEnabled } from "@/server/providers/video";

export async function generateMetadata() {
  const locale = await initLocale();
  const t = await getTranslations({ locale, namespace: "admin.videos" });
  return { title: t("title") };
}

async function Content() {
  const { session } = await requirePortal("/admin/videos");
  if (!session.actor.permissions.has("content.edit")) return <NoAccess />;
  return <VideosPage uploadsEnabled={videoUploadsEnabled()} />;
}

export default function Page() {
  return (
    <Streamed>
      <Content />
    </Streamed>
  );
}
