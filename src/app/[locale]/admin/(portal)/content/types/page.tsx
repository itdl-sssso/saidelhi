import { getTranslations } from "next-intl/server";
import { initLocale } from "@/i18n/server";
import { NoAccess } from "@/features/admin/kit";
import { requirePortal } from "@/features/admin/server";
import { Streamed } from "@/features/admin/Streamed";
import { ContentTypesPage } from "@/features/admin/content/ContentTypesPage";

export async function generateMetadata() {
  const locale = await initLocale();
  const t = await getTranslations({ locale, namespace: "admin.content" });
  return { title: t("typesTitle") };
}

async function Content() {
  const { allowed } = await requirePortal("/admin/content/types", "content.types");
  if (!allowed) return <NoAccess />;
  return <ContentTypesPage />;
}

export default function Page() {
  return (
    <Streamed>
      <Content />
    </Streamed>
  );
}
