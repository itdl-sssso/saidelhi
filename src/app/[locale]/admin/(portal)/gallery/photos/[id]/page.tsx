import { getTranslations } from "next-intl/server";
import { initLocale } from "@/i18n/server";
import { PhotoEditor } from "@/features/gallery-editor/PhotoEditor";
import { NoAccess } from "@/features/admin/kit";
import { requirePortal } from "@/features/admin/server";
import { Streamed } from "@/features/admin/Streamed";

export async function generateMetadata() {
  const locale = await initLocale();
  const t = await getTranslations({ locale, namespace: "admin.gallery" });
  return { title: t("editorMeta") };
}

async function Content({ params }: PageProps<"/[locale]/admin/gallery/photos/[id]">) {
  const { id } = await params;
  const { session } = await requirePortal(`/admin/gallery/photos/${id}`);
  const perms = session.actor.permissions;
  if (!perms.has("gallery.review") && !perms.has("gallery.upload")) return <NoAccess />;
  return <PhotoEditor id={id} />;
}

export default function Page(props: PageProps<"/[locale]/admin/gallery/photos/[id]">) {
  return (
    <Streamed>
      <Content {...props} />
    </Streamed>
  );
}
