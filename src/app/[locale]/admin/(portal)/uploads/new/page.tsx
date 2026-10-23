import { getTranslations } from "next-intl/server";
import { initLocale } from "@/i18n/server";
import { NoAccess } from "@/features/admin/kit";
import { requirePortal } from "@/features/admin/server";
import { Streamed } from "@/features/admin/Streamed";
import { UploadWizard } from "@/features/admin/uploads/UploadWizard";

export async function generateMetadata() {
  const locale = await initLocale();
  const t = await getTranslations({ locale, namespace: "admin.uploads" });
  return { title: t("newTitle") };
}

async function Content() {
  const { allowed } = await requirePortal("/admin/uploads/new", "uploads.manage");
  if (!allowed) return <NoAccess />;
  return <UploadWizard />;
}

export default function Page() {
  return (
    <Streamed>
      <Content />
    </Streamed>
  );
}
