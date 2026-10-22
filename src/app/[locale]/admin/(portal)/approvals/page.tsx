import { getTranslations } from "next-intl/server";
import { initLocale } from "@/i18n/server";
import { ApprovalsQuery } from "@/contract";
import { ApprovalsPage } from "@/features/admin/approvals/ApprovalsPage";
import { Streamed } from "@/features/admin/Streamed";
import { NoAccess } from "@/features/admin/kit";
import { guarded, one, requirePortal, withParams } from "@/features/admin/server";
import { services } from "@/server/services";

export async function generateMetadata() {
  const locale = await initLocale();
  const t = await getTranslations({ locale, namespace: "admin.approvals" });
  return { title: t("title") };
}

async function Content({ searchParams }: PageProps<"/[locale]/admin/approvals">) {
  const sp = await searchParams;
  const { session, locale, allowed } = await requirePortal(withParams("/admin/approvals", sp), "approvals.read");
  if (!allowed) return <NoAccess />;
  const perms = session.actor.permissions;
  const parsed = ApprovalsQuery.safeParse({ tab: one(sp.tab), page: one(sp.page) });
  const query = parsed.success ? parsed.data : ApprovalsQuery.parse({});
  // The escalated tab is for the state team only.
  const tab = query.tab === "escalated" && !perms.has("approvals.escalated") ? "plans" : (query.tab ?? "plans");
  const res = await guarded(() => services().portal.approvals.list(session.actor, { ...query, tab }));
  if (!res) return <NoAccess />;
  return (
    <ApprovalsPage
      locale={locale}
      cards={res.data}
      counts={res.meta.counts}
      tab={tab}
      page={res.meta.page}
      pageSize={res.meta.pageSize}
      total={res.meta.total}
      sp={sp}
      nowIso={new Date().toISOString()}
      canDecide={perms.has("approvals.decide") && perms.has("events.approve")}
      canEscalated={perms.has("approvals.escalated")}
    />
  );
}

export default function Page(props: PageProps<"/[locale]/admin/approvals">) {
  return (
    <Streamed>
      <Content {...props} />
    </Streamed>
  );
}
