import { getTranslations } from "next-intl/server";
import { initLocale } from "@/i18n/server";
import { PlanPage } from "@/features/admin/events/PlanPage";
import { controlsFor } from "@/features/admin/events/lifecycle";
import { Streamed } from "@/features/admin/Streamed";
import { NoAccess } from "@/features/admin/kit";
import { guarded, requirePortal } from "@/features/admin/server";
import { services } from "@/server/services";

export async function generateMetadata() {
  const locale = await initLocale();
  const t = await getTranslations({ locale, namespace: "admin.form" });
  return { title: t("editTitle") };
}

async function Content({ params }: PageProps<"/[locale]/admin/events/[id]/edit">) {
  const { id } = await params;
  const { session, locale, allowed } = await requirePortal(`/admin/events/${id}/edit`, "events.plan");
  if (!allowed) return <NoAccess />;
  const event = await guarded(() => services().portal.events.get(session.actor, id));
  if (!event || !controlsFor(event, [...session.actor.permissions]).edit) return <NoAccess />;
  return <PlanPage session={session} locale={locale} event={event} />;
}

export default function Page(props: PageProps<"/[locale]/admin/events/[id]/edit">) {
  return (
    <Streamed>
      <Content {...props} />
    </Streamed>
  );
}
