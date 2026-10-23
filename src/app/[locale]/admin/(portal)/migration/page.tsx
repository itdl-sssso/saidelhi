import { getTranslations } from "next-intl/server";
import { initLocale } from "@/i18n/server";
import { NoAccess } from "@/features/admin/kit";
import { requirePortal } from "@/features/admin/server";
import { Streamed } from "@/features/admin/Streamed";
import { MigrationPage } from "@/features/admin/migration/MigrationPage";

export async function generateMetadata() {
  const locale = await initLocale();
  const t = await getTranslations({ locale, namespace: "admin.migration" });
  return { title: t("title") };
}

async function Content() {

  const { allowed } = await requirePortal("/admin/migration", "migration.run");
  if (!allowed) return <NoAccess />;

  return <MigrationPage />;
}

export default function Page() {
  return (
    <Streamed>
      <Content />
    </Streamed>
  );
}
