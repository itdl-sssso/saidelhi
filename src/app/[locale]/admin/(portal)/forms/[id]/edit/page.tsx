import { getTranslations } from "next-intl/server";
import { initLocale } from "@/i18n/server";
import { BuilderPage } from "@/features/admin/forms/BuilderPage";
import { NoAccess } from "@/features/admin/kit";
import { requirePortal } from "@/features/admin/server";
import { Streamed } from "@/features/admin/Streamed";

export async function generateMetadata() {
  const locale = await initLocale();
  const t = await getTranslations({ locale, namespace: "admin.builder" });
  return { title: t("title") };
}

async function Content({ params }: PageProps<"/[locale]/admin/forms/[id]/edit">) {
  const { id } = await params;
  const { allowed } = await requirePortal(`/admin/forms/${id}/edit`, "forms.manage");
  if (!allowed) return <NoAccess />;
  return <BuilderPage id={id} />;
}

export default function Page(props: PageProps<"/[locale]/admin/forms/[id]/edit">) {
  return (
    <Streamed>
      <Content {...props} />
    </Streamed>
  );
}
