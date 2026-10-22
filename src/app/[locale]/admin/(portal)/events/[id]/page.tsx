import { getTranslations } from "next-intl/server";
import { initLocale } from "@/i18n/server";
import { EventDetail } from "@/features/admin/events/EventDetail";
import { Streamed } from "@/features/admin/Streamed";
import { NoAccess } from "@/features/admin/kit";
import { guarded, requirePortal } from "@/features/admin/server";
import { services } from "@/server/services";

export async function generateMetadata() {
  const locale = await initLocale();
  const t = await getTranslations({ locale, namespace: "admin.event" });
  return { title: t("metaTitle") };
}

async function Content({ params }: PageProps<"/[locale]/admin/events/[id]">) {
  const { id } = await params;
  const { session, allowed } = await requirePortal(`/admin/events/${id}`, "events.read");
  if (!allowed) return <NoAccess />;
  const event = await guarded(() => services().portal.events.get(session.actor, id));
  if (!event) return <NoAccess />;
  return <EventDetail event={event} perms={[...session.actor.permissions]} />;
}

export default function Page(props: PageProps<"/[locale]/admin/events/[id]">) {
  return (
    <Streamed>
      <Content {...props} />
    </Streamed>
  );
}
