import { getTranslations } from "next-intl/server";
import { Overview } from "@/features/admin/overview/Overview";
import { Streamed } from "@/features/admin/Streamed";
import { NoAccess } from "@/features/admin/kit";
import { firstAllowedHref } from "@/features/admin/nav";
import { guarded, one, requirePortal, withParams } from "@/features/admin/server";
import { redirect } from "@/i18n/navigation";
import { istParts, tx } from "@/lib/format";
import { services } from "@/server/services";

async function Content({ searchParams }: PageProps<"/[locale]/admin">) {
  const sp = await searchParams;
  const { session, allowed, locale } = await requirePortal(withParams("/admin", sp), "overview.read");
  if (!allowed) {
    const href = firstAllowedHref(session.me.permissions);
    if (href && href !== "/admin") redirect({ href, locale });
    return <NoAccess />;
  }
  const t = await getTranslations({ locale, namespace: "admin.shell" });
  const data = await guarded(() => services().portal.overview.get(session.actor, one(sp.scope)));
  if (!data) return <NoAccess />;
  const can = (p: Parameters<typeof session.actor.permissions.has>[0]) => session.actor.permissions.has(p);
  const scopeLabel = data.scope ? tx(data.scope.name, locale) : t("allNcr");
  return <Overview data={data} name={session.me.user.name} hour={istParts(new Date()).hh} can={can} scopeLabel={scopeLabel} />;
}

export default function Page(props: PageProps<"/[locale]/admin">) {
  return (
    <Streamed kpis>
      <Content {...props} />
    </Streamed>
  );
}
