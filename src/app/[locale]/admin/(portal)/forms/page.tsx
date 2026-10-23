import { getTranslations } from "next-intl/server";
import { initLocale } from "@/i18n/server";
import { FormsPage } from "@/features/admin/forms/FormsPage";
import { NoAccess } from "@/features/admin/kit";
import { requirePortal } from "@/features/admin/server";
import { Streamed } from "@/features/admin/Streamed";

export async function generateMetadata() {
  const locale = await initLocale();
  const t = await getTranslations({ locale, namespace: "admin.forms" });
  return { title: t("title") };
}

async function Content() {
  const { allowed } = await requirePortal("/admin/forms", "forms.read");
  if (!allowed) return <NoAccess />;
  return <FormsPage />;
}

export default function Page() {
  return (
    <Streamed>
      <Content />
    </Streamed>
  );
}
