import { getTranslations } from "next-intl/server";
import { initLocale } from "@/i18n/server";
import { CentreEditor } from "@/features/admin/centres/CentreEditor";
import { NoAccess } from "@/features/admin/kit";
import { requirePortal } from "@/features/admin/server";
import { Streamed } from "@/features/admin/Streamed";

export async function generateMetadata() {
  const locale = await initLocale();
  const t = await getTranslations({ locale, namespace: "admin.centres" });
  return { title: t("editTitle") };
}

async function Content({ params }: PageProps<"/[locale]/admin/centres/[id]">) {
  const { id } = await params;
  const { allowed, session } = await requirePortal(`/admin/centres/${id}`, "centres.manage");
  if (!allowed) return <NoAccess />;
  return <CentreEditor id={id} canList={session.actor.role !== "samithi_coord"} />;
}

export default function Page(props: PageProps<"/[locale]/admin/centres/[id]">) {
  return (
    <Streamed>
      <Content {...props} />
    </Streamed>
  );
}
