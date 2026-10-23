import { getTranslations } from "next-intl/server";
import { initLocale } from "@/i18n/server";
import { NoAccess } from "@/features/admin/kit";
import { orgOptions, requirePortal } from "@/features/admin/server";
import { Streamed } from "@/features/admin/Streamed";
import { ContentEditorPage } from "@/features/admin/content/ArticleEditor";

export async function generateMetadata() {
  const locale = await initLocale();
  const t = await getTranslations({ locale, namespace: "admin.content" });
  return { title: t("title") };
}

async function Content({ params }: PageProps<"/[locale]/admin/content/[id]">) {
  const { id } = await params;
  const { allowed, session, locale } = await requirePortal(`/admin/content/${id}`, "content.edit");
  if (!allowed) return <NoAccess />;
  const org = await orgOptions(session, locale);
  return <ContentEditorPage id={id} org={org} />;
}

export default function Page(props: PageProps<"/[locale]/admin/content/[id]">) {
  return (
    <Streamed>
      <Content {...props} />
    </Streamed>
  );
}
