import { getTranslations } from "next-intl/server";
import { initLocale } from "@/i18n/server";
import { Streamed } from "@/features/admin/Streamed";
import { NoAccess, PageHead } from "@/features/admin/kit";
import { OrgManager } from "@/features/admin/org/OrgManager";
import { guarded, requirePortal } from "@/features/admin/server";
import { services } from "@/server/services";
import styles from "@/features/admin/Admin.module.css";

export async function generateMetadata() {
  const locale = await initLocale();
  const t = await getTranslations({ locale, namespace: "admin.org" });
  return { title: t("title") };
}

async function Content() {
  const { session, locale, allowed } = await requirePortal("/admin/org", "org.manage");
  if (!allowed) return <NoAccess />;
  const t = await getTranslations({ locale, namespace: "admin.org" });
  const tree = await guarded(() => services().portal.org.tree(session.actor));
  if (!tree) return <NoAccess />;
  const perms = session.actor.permissions;
  return (
    <div className={styles.page}>
      <PageHead title={t("title")} sub={t("sub")} />
      <OrgManager tree={tree} canManage={perms.has("org.manage")} isState={session.actor.all} canAudit={perms.has("audit.read")} />
    </div>
  );
}

export default function Page() {
  return (
    <Streamed>
      <Content />
    </Streamed>
  );
}
