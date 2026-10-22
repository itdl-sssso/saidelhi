import { getTranslations } from "next-intl/server";
import { initLocale } from "@/i18n/server";
import { Streamed } from "@/features/admin/Streamed";
import { NoAccess } from "@/features/admin/kit";
import { PlanPage } from "@/features/admin/events/PlanPage";
import { requirePortal } from "@/features/admin/server";

export async function generateMetadata() {
  const locale = await initLocale();
  const t = await getTranslations({ locale, namespace: "admin.form" });
  return { title: t("newTitle") };
}

async function Content() {
  const { session, locale, allowed } = await requirePortal("/admin/events/new", "events.plan");
  if (!allowed) return <NoAccess />;
  return <PlanPage session={session} locale={locale} />;
}

export default function Page() {
  return (
    <Streamed>
      <Content />
    </Streamed>
  );
}
