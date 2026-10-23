import { getTranslations } from "next-intl/server";
import { initLocale } from "@/i18n/server";
import { CentresPage } from "@/features/admin/centres/CentresPage";
import { NoAccess } from "@/features/admin/kit";
import { orgOptions, requirePortal } from "@/features/admin/server";
import { Streamed } from "@/features/admin/Streamed";

export async function generateMetadata() {
  const locale = await initLocale();
  const t = await getTranslations({ locale, namespace: "admin.centres" });
  return { title: t("title") };
}

async function Content() {
  const { allowed, session, locale } = await requirePortal("/admin/centres", "centres.manage");
  if (!allowed) return <NoAccess />;
  const org = await orgOptions(session, locale);
  return <CentresPage org={org} single={session.actor.role === "samithi_coord"} />;
}

export default function Page() {
  return (
    <Streamed>
      <Content />
    </Streamed>
  );
}
