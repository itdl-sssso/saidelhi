import { getTranslations } from "next-intl/server";
import { initLocale } from "@/i18n/server";
import { AdminLinksQuery } from "@/contract";
import { LinksPage } from "@/features/admin/links/LinksPage";
import { Streamed } from "@/features/admin/Streamed";
import { NoAccess } from "@/features/admin/kit";
import { guarded, one, orgOptions, requirePortal, withParams } from "@/features/admin/server";
import { services } from "@/server/services";

export async function generateMetadata() {
  const locale = await initLocale();
  const t = await getTranslations({ locale, namespace: "admin.links" });
  return { title: t("title") };
}

async function Content({ searchParams }: PageProps<"/[locale]/admin/links">) {
  const sp = await searchParams;
  const { session, locale, allowed } = await requirePortal(withParams("/admin/links", sp), "links.read");
  if (!allowed) return <NoAccess />;
  const flat = Object.fromEntries(Object.entries(sp).map(([k, v]) => [k, one(v)]));
  const parsed = AdminLinksQuery.safeParse(flat);
  const query = parsed.success ? parsed.data : AdminLinksQuery.parse({});
  const [res, org] = await Promise.all([guarded(() => services().portal.links.list(session.actor, query)), orgOptions(session, locale)]);
  if (!res) return <NoAccess />;
  return (
    <LinksPage
      locale={locale}
      rows={res.data}
      total={res.meta.total}
      expiringSoon={res.meta.expiringSoon}
      query={query}
      sp={sp}
      org={org}
      canManage={session.actor.permissions.has("links.manage")}
    />
  );
}

export default function Page(props: PageProps<"/[locale]/admin/links">) {
  return (
    <Streamed>
      <Content {...props} />
    </Streamed>
  );
}
