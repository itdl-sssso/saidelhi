import { getTranslations } from "next-intl/server";
import type { ApprovalCard, ApprovalsTab } from "@/contract";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/lib/format";
import { Pagination } from "@/ui/Pagination";
import { PageHead } from "../kit";
import { hrefWith, type Params } from "../url";
import { ApprovalCards } from "./ApprovalCards";
import styles from "../Admin.module.css";

export async function ApprovalsPage({
  locale,
  cards,
  counts,
  tab,
  page,
  pageSize,
  total,
  sp,
  nowIso,
  canDecide,
  canEscalated,
}: {
  locale: AppLocale;
  cards: ApprovalCard[];
  counts: Record<ApprovalsTab, number>;
  tab: ApprovalsTab;
  page: number;
  pageSize: number;
  total: number;
  sp: Params;
  nowIso: string;
  canDecide: boolean;
  canEscalated: boolean;
}) {
  const t = await getTranslations({ locale, namespace: "admin.approvals" });
  const tabs: ApprovalsTab[] = canEscalated ? ["plans", "reports", "escalated"] : ["plans", "reports"];
  return (
    <div className={styles.page}>
      <PageHead title={t("title")} sub={t("sub")} />
      <div className={styles.row} style={{ justifyContent: "space-between" }}>
        <div className={styles.tabs} role="navigation" aria-label={t("tabsLabel")}>
          {tabs.map((id) => (
            <Link key={id} href={hrefWith("/admin/approvals", sp, { tab: id === "plans" ? null : id })} className={styles.tab} aria-current={tab === id ? "page" : undefined}>
              {t(`tab.${id}`)}
              <span className={id === "escalated" && counts[id] > 0 ? styles.tabCountHot : styles.tabCount}>{counts[id]}</span>
            </Link>
          ))}
        </div>
        <span className={styles.cap}>{t("oldestFirst")}</span>
      </div>
      <ApprovalCards cards={cards} nowIso={nowIso} canDecide={canDecide} tab={tab} />
      {tab === "plans" && cards.length ? <span className={styles.cap}>{t("bulkNote")}</span> : null}
      {total > pageSize ? <Pagination page={page} pageSize={pageSize} total={total} href={(p) => hrefWith("/admin/approvals", sp, { page: p })} /> : null}
    </div>
  );
}
