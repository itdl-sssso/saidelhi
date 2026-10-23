import { getTranslations } from "next-intl/server";
import { initLocale } from "@/i18n/server";
import { NoAccess } from "@/features/admin/kit";
import { orgOptions, requirePortal } from "@/features/admin/server";
import { Streamed } from "@/features/admin/Streamed";
import { ContentPage } from "@/features/admin/content/ContentPage";

export async function generateMetadata() {
  const locale = await initLocale();
  const t = await getTranslations({ locale, namespace: "admin.content" });
  return { title: t("title") };
}

async function Content() {

  const { allowed, session, locale } = await requirePortal("/admin/content", "content.edit");
  if (!allowed) return <NoAccess />;
  const org = await orgOptions(session, locale);
  return <ContentPage org={org} />;
}

export default function Page() {
  return (
    <Streamed>
      <Content />
    </Streamed>
  );
}
