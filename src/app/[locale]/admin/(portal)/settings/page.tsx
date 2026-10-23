import { getTranslations } from "next-intl/server";
import { initLocale } from "@/i18n/server";
import { NoAccess } from "@/features/admin/kit";
import { requirePortal, withParams } from "@/features/admin/server";
import { SettingsPage } from "@/features/admin/settings/SettingsPage";
import { Streamed } from "@/features/admin/Streamed";

export async function generateMetadata() {
  const locale = await initLocale();
  const t = await getTranslations({ locale, namespace: "admin.settings" });
  return { title: t("title") };
}

async function Content({ searchParams }: PageProps<"/[locale]/admin/settings">) {
  const sp = await searchParams;
  const { allowed } = await requirePortal(withParams("/admin/settings", sp), "settings.manage");
  if (!allowed) return <NoAccess />;
  return <SettingsPage />;
}

export default function Page(props: PageProps<"/[locale]/admin/settings">) {
  return (
    <Streamed>
      <Content {...props} />
    </Streamed>
  );
}
