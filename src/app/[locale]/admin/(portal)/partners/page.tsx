import { getTranslations } from "next-intl/server";
import { initLocale } from "@/i18n/server";
import { PartnersPage } from "@/features/admin/partners/PartnersPage";
import { NoAccess } from "@/features/admin/kit";
import { requirePortal } from "@/features/admin/server";
import { Streamed } from "@/features/admin/Streamed";

export async function generateMetadata() {
  const locale = await initLocale();
  const t = await getTranslations({ locale, namespace: "admin.partners" });
  return { title: t("title") };
}

async function Content() {
  const { allowed } = await requirePortal("/admin/partners", "partners.manage");
  if (!allowed) return <NoAccess />;
  return <PartnersPage />;
}

export default function Page() {
  return (
    <Streamed>
      <Content />
    </Streamed>
  );
}
