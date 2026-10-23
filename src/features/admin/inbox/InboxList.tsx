"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { type InboxListMeta, type InboxRow, type InboxState, adminEndpoints } from "@/contract";
import { Link } from "@/i18n/navigation";
import { type AppLocale, tx } from "@/lib/format";
import { EmptyState } from "@/ui/EmptyState";
import { Icon } from "@/ui/Icon";
import { Pagination } from "@/ui/Pagination";
import { SkeletonRows } from "@/ui/Skeleton";
import { PageHead } from "../kit";
import { Link2 } from "../icons";
import { fmtShortDateTime } from "../time";
import { useApi } from "../useApi";
import { hrefWith } from "../url";
import { ConfPill, SourceIcon, useAge } from "./parts";
import styles from "../Admin.module.css";
import s from "./Inbox.module.css";

const TABS: InboxState[] = ["for_me", "escalated", "done"];
const PAGE_SIZE = 20;

export function InboxList() {
  const t = useTranslations("admin.inbox");
  const locale = useLocale() as AppLocale;
  const sp = useSearchParams();
  const age = useAge();
  const rawTab = sp.get("tab");
  const tab: InboxState = TABS.includes(rawTab as InboxState) ? (rawTab as InboxState) : "for_me";
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const params = Object.fromEntries(sp.entries());
  const api = useApi<InboxRow[], InboxListMeta>(adminEndpoints.inbox({ tab, page, pageSize: PAGE_SIZE }));
  const counts = api.meta?.counts;

  return (
    <div className={styles.page}>
      <PageHead title={t("title")} sub={t("sub")} />
      <div className={styles.tabs} role="navigation" aria-label={t("tabsLabel")}>
        {TABS.map((id) => (
          <Link key={id} href={hrefWith("/admin/inbox", params, { tab: id === "for_me" ? null : id })} className={styles.tab} aria-current={tab === id ? "page" : undefined}>
            {t(`tab.${id}`)}
            {counts ? <span className={id === "escalated" && counts[id] > 0 ? styles.tabCountHot : styles.tabCount}>{counts[id]}</span> : null}
          </Link>
        ))}
      </div>

      {api.status === "loading" ? (
        <div className={styles.card}>
          <SkeletonRows />
        </div>
      ) : api.status === "forbidden" ? (
        <EmptyState icon="lock" title={t("forbidden")} />
      ) : api.status !== "ready" ? (
        <EmptyState icon="cloud-off" title={t("loadError")} action={<button type="button" className={styles.linkBtn} onClick={api.reload}>{t("retry")}</button>} />
      ) : api.data.length === 0 ? (
        <EmptyState icon="inbox" title={t(`empty.${tab}`)} body={t("emptyBody")} />
      ) : (
        <>
          <ul className={s.list}>
            {api.data.map((r) => (
              <li key={r.id}>
                <Link href={`/admin/inbox/${r.id}`} className={s.row}>
                  <SourceIcon source={r.source} />
                  <span className={s.who}>
                    <span className={styles.tblT}>{r.sender}</span>
                    <span className={styles.cap}>
                      {t(`source.${r.source}`)} · {fmtShortDateTime(r.receivedAt, locale)}
                    </span>
                  </span>
                  <span className={r.matchedEvent ? s.ev : `${s.ev} ${s.noEv}`}>
                    {r.matchedEvent ? <Icon icon={Link2} size={16} /> : <Icon name="info" size={16} />}
                    {r.matchedEvent ? tx(r.matchedEvent.title, locale) : t("noEvent")}
                  </span>
                  <span className={s.conf}>
                    <ConfPill level={r.confidence} />
                  </span>
                  <span className={`${styles.cap} ${s.age}`}>{age(r.ageDays)}</span>
                </Link>
              </li>
            ))}
          </ul>
          {(api.meta?.total ?? 0) > PAGE_SIZE ? <Pagination page={page} pageSize={PAGE_SIZE} total={api.meta?.total ?? 0} href={(p) => hrefWith("/admin/inbox", params, { page: p })} /> : null}
        </>
      )}
    </div>
  );
}
