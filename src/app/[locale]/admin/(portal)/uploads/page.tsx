import { getTranslations } from "next-intl/server";
import { initLocale } from "@/i18n/server";
import { NoAccess } from "@/features/admin/kit";
import { requirePortal } from "@/features/admin/server";
import { Streamed } from "@/features/admin/Streamed";
import { UploadsPage } from "@/features/admin/uploads/UploadsPage";

export async function generateMetadata() {
  const locale = await initLocale();
  const t = await getTranslations({ locale, namespace: "admin.uploads" });
  return { title: t("title") };
}

async function Content() {
  const { allowed } = await requirePortal("/admin/uploads", "uploads.manage");
  if (!allowed) return <NoAccess />;
  return <UploadsPage />;
}

export default function Page() {
  return (
    <Streamed>
      <Content />
    </Streamed>
  );
}
