import { getTranslations } from "next-intl/server";
import { initLocale } from "@/i18n/server";
import { NoAccess } from "@/features/admin/kit";
import { orgOptions, requirePortal } from "@/features/admin/server";
import { Streamed } from "@/features/admin/Streamed";
import { ReportsPage } from "@/features/admin/reports/ReportsPage";

export async function generateMetadata() {
  const locale = await initLocale();
  const t = await getTranslations({ locale, namespace: "admin.reports" });
  return { title: t("title") };
}

async function Content() {

  const { allowed, session, locale } = await requirePortal("/admin/reports", "reports.export");
  if (!allowed) return <NoAccess />;
  const org = await orgOptions(session, locale);
  return <ReportsPage org={org} />;
}

export default function Page() {
  return (
    <Streamed>
      <Content />
    </Streamed>
  );
}
