import { getTranslations } from "next-intl/server";
import { initLocale } from "@/i18n/server";
import { NoAccess } from "@/features/admin/kit";
import { orgOptions, requirePortal } from "@/features/admin/server";
import { Streamed } from "@/features/admin/Streamed";
import { VolunteersPage } from "@/features/admin/volunteers/VolunteersPage";

export async function generateMetadata() {
  const locale = await initLocale();
  const t = await getTranslations({ locale, namespace: "admin.volunteers" });
  return { title: t("title") };
}

async function Content() {
  const { allowed, session, locale } = await requirePortal("/admin/sevadal", "volunteers.read");
  if (!allowed) return <NoAccess />;
  const org = await orgOptions(session, locale);
  return <VolunteersPage org={org} />;
}

export default function Page() {
  return (
    <Streamed>
      <Content />
    </Streamed>
  );
}
