import { getTranslations } from "next-intl/server";
import { initLocale } from "@/i18n/server";
import { NoAccess } from "@/features/admin/kit";
import { requirePortal } from "@/features/admin/server";
import { Streamed } from "@/features/admin/Streamed";
import { DiscoursesList } from "@/features/admin/discourses/DiscoursesList";

export async function generateMetadata() {
  const locale = await initLocale();
  const t = await getTranslations({ locale, namespace: "admin.discourses" });
  return { title: t("title") };
}

async function Content() {
  const { allowed, session } = await requirePortal("/admin/discourses", "discourses.edit");
  if (!allowed) return <NoAccess />;
  const p = session.actor.permissions;
  return <DiscoursesList can={{ edit: p.has("discourses.edit"), review: p.has("discourses.review") }} />;
}

export default function Page() {
  return (
    <Streamed>
      <Content />
    </Streamed>
  );
}
