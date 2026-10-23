import { getTranslations } from "next-intl/server";
import { initLocale } from "@/i18n/server";
import { NoAccess } from "@/features/admin/kit";
import { requirePortal } from "@/features/admin/server";
import { Streamed } from "@/features/admin/Streamed";
import { ThoughtsPage } from "@/features/admin/content/ThoughtsPage";

export async function generateMetadata() {
  const locale = await initLocale();
  const t = await getTranslations({ locale, namespace: "admin.content" });
  return { title: t("title") };
}

async function Content() {

  const { allowed } = await requirePortal("/admin/content/thoughts", "content.edit");
  if (!allowed) return <NoAccess />;

  return <ThoughtsPage />;
}

export default function Page() {
  return (
    <Streamed>
      <Content />
    </Streamed>
  );
}
