import { getTranslations } from "next-intl/server";
import { initLocale } from "@/i18n/server";
import { AdminEventsQuery } from "@/contract";
import { EventsList } from "@/features/admin/events/EventsList";
import { Streamed } from "@/features/admin/Streamed";
import { NoAccess } from "@/features/admin/kit";
import { guarded, one, orgOptions, requirePortal, withParams } from "@/features/admin/server";
import { services } from "@/server/services";

export async function generateMetadata() {
  const locale = await initLocale();
  const t = await getTranslations({ locale, namespace: "admin.events" });
  return { title: t("title") };
}

async function Content({ searchParams }: PageProps<"/[locale]/admin/events">) {
  const sp = await searchParams;
  const { session, locale, allowed } = await requirePortal(withParams("/admin/events", sp), "events.read");
  if (!allowed) return <NoAccess />;
  const flat = Object.fromEntries(Object.entries(sp).map(([k, v]) => [k, one(v)]));
  const parsed = AdminEventsQuery.safeParse(flat);
  const query = parsed.success ? parsed.data : AdminEventsQuery.parse({});
  const [res, org] = await Promise.all([guarded(() => services().portal.events.list(session.actor, query)), orgOptions(session, locale)]);
  if (!res) return <NoAccess />;
  const can = (p: Parameters<typeof session.actor.permissions.has>[0]) => session.actor.permissions.has(p);
  return (
    <EventsList
      locale={locale}
      rows={res.data}
      total={res.meta.total}
      counts={res.meta.counts}
      query={query}
      sp={sp}
      org={org}
      canPlan={can("events.plan")}
      canLinks={can("links.manage")}
    />
  );
}

export default function Page(props: PageProps<"/[locale]/admin/events">) {
  return (
    <Streamed>
      <Content {...props} />
    </Streamed>
  );
}
