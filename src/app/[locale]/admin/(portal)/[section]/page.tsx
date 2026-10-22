import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Streamed } from "@/features/admin/Streamed";
import { NoAccess, PageHead } from "@/features/admin/kit";
import { SECTION_BY_SLUG } from "@/features/admin/nav";
import { requirePortal } from "@/features/admin/server";
import { Button } from "@/ui/Button";
import { EmptyState } from "@/ui/EmptyState";
import styles from "@/features/admin/Admin.module.css";

/** Portal sections that arrive in later milestones: the nav links here, the page says so. */
async function Content({ params }: PageProps<"/[locale]/admin/[section]">) {
  const { section } = await params;
  const item = SECTION_BY_SLUG[section];
  if (!item || item.built) notFound();
  const { allowed, locale } = await requirePortal(`/admin/${section}`, item.permission);
  if (!allowed) return <NoAccess />;
  const t = await getTranslations({ locale, namespace: "admin" });
  return (
    <div className={styles.page}>
      <PageHead title={t(`nav.items.${item.id}`)} />
      <div className={styles.card}>
        <div className={styles.cardBd}>
          <EmptyState
            icon="hourglass"
            headingLevel={2}
            title={t("later.title")}
            body={t("later.body")}
            action={
              <Button href="/admin" variant="outline">
                {t("noAccess.toOverview")}
              </Button>
            }
          />
        </div>
      </div>
    </div>
  );
}

export default function Page(props: PageProps<"/[locale]/admin/[section]">) {
  return (
    <Streamed>
      <Content {...props} />
    </Streamed>
  );
}
