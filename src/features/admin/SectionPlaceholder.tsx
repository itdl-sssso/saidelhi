import { getTranslations } from "next-intl/server";
import { initLocale } from "@/i18n/server";
import { Button } from "@/ui/Button";
import { EmptyState } from "@/ui/EmptyState";
import { NoAccess, PageHead } from "./kit";
import { SECTION_BY_SLUG } from "./nav";
import { requirePortal } from "./server";
import { Streamed } from "./Streamed";
import styles from "./Admin.module.css";

/**
 * Portal sections that arrive in later milestones: the nav links here, the page says so.
 * Each lives at its own static route (not a `[section]` catch-all) so an unknown /admin/<x>
 * misses every admin route and gets a real HTTP 404 from the public catch-all, instead of a
 * 200 streamed after the portal shell has started. A later milestone replaces a route's page.tsx.
 */
async function Content({ slug }: { slug: string }) {
  const item = SECTION_BY_SLUG[slug];
  const { allowed, locale } = await requirePortal(`/admin/${slug}`, item.permission);
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

export function SectionPlaceholder({ slug }: { slug: string }) {
  return (
    <Streamed>
      <Content slug={slug} />
    </Streamed>
  );
}

export async function sectionMetadata(slug: string) {
  const locale = await initLocale();
  const t = await getTranslations({ locale, namespace: "admin" });
  return { title: t(`nav.items.${SECTION_BY_SLUG[slug].id}`) };
}
