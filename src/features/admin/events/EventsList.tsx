import { getTranslations } from "next-intl/server";
import { type AdminEventsQuery, EventStatus, Source, SevaType } from "@/contract";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/lib/format";
import { Button } from "@/ui/Button";
import { EmptyState } from "@/ui/EmptyState";
import { Pagination } from "@/ui/Pagination";
import { FilterBar, type FilterField } from "../FilterBar";
import { PageHead } from "../kit";
import type { OrgOptions } from "../server";
import { hrefWith, type Params } from "../url";
import { EventsTable } from "./EventsTable";
import type { EventRow } from "@/contract";
import styles from "../Admin.module.css";

const TAB_ORDER = ["all", "draft", "awaiting_approval", "planned", "awaiting_report", "report_submitted", "approved", "escalated", "cancelled", "postponed"] as const;
/** Draft and postponed tabs only appear when they hold something. */
const OPTIONAL_TABS = new Set(["draft", "postponed"]);

export async function EventsList({
  locale,
  rows,
  total,
  counts,
  query,
  sp,
  org,
  canPlan,
  canLinks,
}: {
  locale: AppLocale;
  rows: EventRow[];
  total: number;
  counts: Record<string, number>;
  query: AdminEventsQuery;
  sp: Params;
  org: OrgOptions;
  canPlan: boolean;
  canLinks: boolean;
}) {
  const t = await getTranslations({ locale, namespace: "admin.events" });
  const tStatus = await getTranslations({ locale, namespace: "status" });
  const tSeva = await getTranslations({ locale, namespace: "seva" });
  const tSource = await getTranslations({ locale, namespace: "admin.source" });
  const status = query.status ?? "all";
  const sort = query.sort ?? "-startsAt";
  const path = "/admin/events";

  const fields: FilterField[] = [
    { kind: "date", key: "from", label: t("from") },
    { kind: "date", key: "to", label: t("to") },
    { kind: "select", key: "sevaType", label: t("fSeva"), options: SevaType.options.map((v) => ({ value: v, label: tSeva(v) })) },
    ...(org.districts.length > 1 ? [{ kind: "select" as const, key: "district", label: t("fDistrict"), options: org.districts }] : []),
    ...(org.samithis.length > 1
      ? [{ kind: "select" as const, key: "samithi", label: t("fSamithi"), options: org.samithis.filter((s) => !query.district || s.districtId === query.district) }]
      : []),
    { kind: "select", key: "source", label: t("fSource"), options: Source.options.map((v) => ({ value: v, label: tSource(v) })) },
  ];
  const filtered = ["from", "to", "sevaType", "district", "samithi", "source"].some((k) => sp[k]);

  return (
    <div className={styles.page}>
      <PageHead
        title={t("title")}
        sub={t("sub")}
        actions={
          canPlan ? (
            <Button href="/admin/events/new" icon="plus">
              {t("plan")}
            </Button>
          ) : undefined
        }
      />
      <div className={styles.tabs} role="navigation" aria-label={t("tabsLabel")}>
        {TAB_ORDER.filter((s) => !OPTIONAL_TABS.has(s) || (counts[s] ?? 0) > 0 || status === s).map((s) => (
          <Link key={s} href={hrefWith(path, sp, { status: s === "all" ? null : s })} className={styles.tab} aria-current={status === s ? "page" : undefined}>
            {s === "all" ? t("tabAll") : tStatus(EventStatus.parse(s))}
            <span className={s === "escalated" && (counts[s] ?? 0) > 0 ? styles.tabCountHot : styles.tabCount}>{counts[s] ?? 0}</span>
          </Link>
        ))}
      </div>
      <FilterBar fields={fields} />
      <div className={styles.tblWrap}>
        {rows.length === 0 ? (
          <div className={styles.cardBd}>
            <EmptyState
              icon="calendar-search"
              title={filtered || status !== "all" ? t("emptyFiltered") : t("empty")}
              body={filtered || status !== "all" ? t("emptyFilteredBody") : t("emptyBody")}
              action={
                canPlan && !filtered && status === "all" ? (
                  <Button href="/admin/events/new" icon="plus">
                    {t("plan")}
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <EventsTable rows={rows} sort={sort} sortHref={hrefWith(path, sp, { sort: sort === "-startsAt" ? "startsAt" : null })} canPlan={canPlan} canLinks={canLinks} />
        )}
        {total > query.pageSize ? (
          <div className={styles.pagerWrap}>
            <Pagination page={query.page} pageSize={query.pageSize} total={total} href={(p) => hrefWith(path, sp, { page: p })} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
