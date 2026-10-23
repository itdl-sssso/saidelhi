import { getTranslations } from "next-intl/server";
import { initLocale } from "@/i18n/server";
import { NoAccess } from "@/features/admin/kit";
import { requirePortal } from "@/features/admin/server";
import { Streamed } from "@/features/admin/Streamed";
import { DiscourseEditor } from "@/features/admin/discourses/DiscourseEditor";

export async function generateMetadata() {
  const locale = await initLocale();
  const t = await getTranslations({ locale, namespace: "admin.discourses" });
  return { title: t("title") };
}

async function Content({ params }: PageProps<"/[locale]/admin/discourses/[id]">) {
  const { id } = await params;
  const { allowed } = await requirePortal(`/admin/discourses/${id}`, "discourses.edit");
  if (!allowed) return <NoAccess />;
  return <DiscourseEditor id={id} />;
}

export default function Page(props: PageProps<"/[locale]/admin/discourses/[id]">) {
  return (
    <Streamed>
      <Content {...props} />
    </Streamed>
  );
}
