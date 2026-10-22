import { getTranslations } from "next-intl/server";
import { initLocale } from "@/i18n/server";
import { AuditQuery } from "@/contract";
import { AuditPage } from "@/features/admin/audit/AuditPage";
import { Streamed } from "@/features/admin/Streamed";
import { NoAccess } from "@/features/admin/kit";
import { guarded, one, requirePortal, withParams } from "@/features/admin/server";
import { services } from "@/server/services";

export async function generateMetadata() {
  const locale = await initLocale();
  const t = await getTranslations({ locale, namespace: "admin.audit" });
  return { title: t("title") };
}

async function Content({ searchParams }: PageProps<"/[locale]/admin/audit">) {
  const sp = await searchParams;
  const { session, locale, allowed } = await requirePortal(withParams("/admin/audit", sp), "audit.read");
  if (!allowed) return <NoAccess />;
  const flat = Object.fromEntries(Object.entries(sp).map(([k, v]) => [k, one(v)]));
  const parsed = AuditQuery.safeParse(flat);
  const query = parsed.success ? parsed.data : AuditQuery.parse({});
  const res = await guarded(() => services().portal.audit.list(session.actor, query));
  if (!res) return <NoAccess />;
  return <AuditPage locale={locale} rows={res.data} total={res.meta.total} query={query} sp={sp} />;
}

export default function Page(props: PageProps<"/[locale]/admin/audit">) {
  return (
    <Streamed>
      <Content {...props} />
    </Streamed>
  );
}
