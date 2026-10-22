import { useLocale, useTranslations } from "next-intl";
import type { EventRow, NeedItem, NeedKey, OverviewPayload, Permission } from "@/contract";
import { Link } from "@/i18n/navigation";
import { type AppLocale, dateParts, formatDayMonth, formatIsoDate, tx, weekdayName } from "@/lib/format";
import { Button } from "@/ui/Button";
import { EmptyState } from "@/ui/EmptyState";
import { Icon, type IconName } from "@/ui/Icon";
import { KpiTile } from "@/ui/KpiTile";
import { StatusPill } from "@/ui/StatusPill";
import { ResendButton } from "../events/ResendButton";
import { CalendarPlus, Link2, Upload } from "../icons";
import { DayChip, PageHead, Panel, type Tone } from "../kit";
import styles from "../Admin.module.css";

const NEED_STYLE: Record<NeedKey, { tone: Tone; icon: IconName }> = {
  plans_to_approve: { tone: "yellow", icon: "hourglass" },
  reports_to_approve: { tone: "yellow", icon: "send" },
  escalations: { tone: "alert", icon: "triangle-alert" },
  reports_overdue: { tone: "pink", icon: "clock" },
  awaiting_report: { tone: "pink", icon: "clipboard-list" },
  drafts: { tone: "slate", icon: "file-pen-line" },
  changes_requested: { tone: "blue", icon: "pencil" },
  inbox: { tone: "blue", icon: "inbox" },
};
const RESENDABLE = new Set<NeedKey>(["reports_overdue", "awaiting_report"]);

function NeedsYou({ items, can }: { items: NeedItem[]; can: (p: Permission) => boolean }) {
  const t = useTranslations("admin.overview");
  const locale = useLocale() as AppLocale;
  return (
    <Panel title={t("needsYou")} flush action={items.length ? <span className={styles.cap}>{t("itemsCount", { count: items.length })}</span> : undefined}>
      {items.length === 0 ? (
        <div className={styles.cardBd}>
          <EmptyState icon="sun" title={t("caughtUp")} body={t("caughtUpBody")} />
        </div>
      ) : (
        items.map((n) => {
          const st = NEED_STYLE[n.key];
          return (
            <div className={styles.need} key={n.key}>
              <span className={`${styles.needIc} ${styles[`t-${st.tone}`]}`}>
                <Icon name={st.icon} size={18} />
              </span>
              <div className={styles.col}>
                <span className={styles.needT}>{tx(n.label, locale)}</span>
              </div>
              <div className={`${styles.row} ${styles.needA}`}>
                {RESENDABLE.has(n.key) && can("links.manage") && n.eventIds.length ? <ResendButton eventIds={n.eventIds} label={t("resendLinks")} variant="outline" /> : null}
                <Button href={n.href} variant={n.key === "plans_to_approve" || n.key === "reports_to_approve" ? "primary" : "ghost"} size="sm" iconAfter="arrow-right">
                  {t(`open.${n.key}`)}
                </Button>
              </div>
            </div>
          );
        })
      )}
    </Panel>
  );
}

function QuickActions({ can }: { can: (p: Permission) => boolean }) {
  const t = useTranslations("admin.overview");
  return (
    <Panel title={t("quick")}>
      <div className={styles.qa}>
        {can("events.plan") ? (
          <Link href="/admin/events/new">
            <span className={styles.qaIc}>
              <Icon icon={CalendarPlus} size={20} />
            </span>
            {t("planEvent")}
          </Link>
        ) : null}
        {can("uploads.manage") ? (
          <Link href="/admin/uploads">
            <span className={styles.qaIc}>
              <Icon icon={Upload} size={20} />
            </span>
            {t("uploadFile")}
          </Link>
        ) : null}
        {can("links.read") ? (
          <Link href="/admin/links">
            <span className={styles.qaIc}>
              <Icon icon={Link2} size={20} />
            </span>
            {t("copyLink")}
          </Link>
        ) : null}
      </div>
    </Panel>
  );
}

function Upcoming({ rows }: { rows: EventRow[] }) {
  const t = useTranslations("admin.overview");
  const locale = useLocale() as AppLocale;
  return (
    <Panel title={t("next14")} flush action={<Button href="/admin/events" variant="ghost" size="sm" iconAfter="arrow-right">{t("allEvents")}</Button>}>
      {rows.length === 0 ? (
        <div className={styles.cardBd}>
          <EmptyState icon="calendar-days" title={t("noUpcoming")} body={t("noUpcomingBody")} />
        </div>
      ) : (
        <>
          <div className={`${styles.tblScroll} ${styles.onlyDesk}`}>
            <table className={styles.tbl}>
              <thead>
                <tr>
                  <th scope="col">{t("colDate")}</th>
                  <th scope="col">{t("colEvent")}</th>
                  <th scope="col">{t("colSamithi")}</th>
                  <th scope="col">{t("colStatus")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((e) => (
                  <tr key={e.id}>
                    <td className={styles.nowrap}>{formatDayMonth(e.startsAt, locale)}</td>
                    <td>
                      <Link href={`/admin/events/${e.id}`} className={styles.tblT}>
                        {tx(e.title, locale)}
                      </Link>
                    </td>
                    <td>{tx(e.samithi.name, locale)}</td>
                    <td>
                      <StatusPill status={e.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={styles.onlyPhone}>
            {rows.slice(0, 5).map((e) => (
              <Link
                key={e.id}
                href={`/admin/events/${e.id}`}
                style={{ display: "grid", gridTemplateColumns: "52px minmax(0,1fr)", gap: 12, padding: "12px 16px", borderBottom: "1px solid var(--border-subtle)", textDecoration: "none", color: "inherit" }}
              >
                <DayChip at={e.startsAt} />
                <span className={styles.ecardBody}>
                  <span className={styles.tblT}>{tx(e.title, locale)}</span>
                  <span className={styles.cap}>{tx(e.samithi.name, locale)}</span>
                  <StatusPill status={e.status} />
                </span>
              </Link>
            ))}
          </div>
        </>
      )}
    </Panel>
  );
}

function SevaBars({ rows }: { rows: OverviewPayload["bySevaType"] }) {
  const t = useTranslations("admin.overview");
  const locale = useLocale() as AppLocale;
  const sorted = rows.filter((r) => r.count > 0).sort((a, b) => b.count - a.count);
  const max = sorted[0]?.count ?? 1;
  return (
    <Panel title={t("bySeva")} action={<span className={styles.cap}>{t("bySevaNote")}</span>}>
      {sorted.length === 0 ? (
        <p className={styles.sub}>{t("noSeva")}</p>
      ) : (
        <div className={styles.hbar}>
          {sorted.map((r) => (
            <div key={r.sevaType} style={{ display: "contents" }}>
              <span>{tx(r.label, locale)}</span>
              <span className={styles.hbarTrack} aria-hidden="true">
                <span className={styles.hbarFill} style={{ width: `${(r.count / max) * 100}%` }} />
              </span>
              <span className={`${styles.strong} ${styles.num}`}>{r.count}</span>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

function Onboarding({ can }: { can: (p: Permission) => boolean }) {
  const t = useTranslations("admin.overview");
  const steps: Array<{ done: boolean; href: string; label: string; show: boolean; icon: IconName }> = [
    { done: false, href: "/admin/centres", label: t("onboard.centre"), show: can("centres.manage"), icon: "map-pin" },
    { done: false, href: "/admin/events/new", label: t("onboard.event"), show: can("events.plan"), icon: "calendar-days" },
    { done: false, href: "/admin/people", label: t("onboard.people"), show: can("people.invite"), icon: "users" },
  ];
  return (
    <Panel title={t("onboard.title")} flush>
      <div className={styles.cardBd}>
        <p className={styles.sub}>{t("onboard.body")}</p>
      </div>
      {steps
        .filter((s) => s.show)
        .map((s) => (
          <div className={styles.need} key={s.href}>
            <span className={`${styles.needIc} ${styles["t-blue"]}`}>
              <Icon name={s.icon} size={18} />
            </span>
            <span className={styles.needT}>{s.label}</span>
            <div className={styles.needA}>
              <Button href={s.href} variant="outline" size="sm" iconAfter="arrow-right">
                {t("onboard.go")}
              </Button>
            </div>
          </div>
        ))}
    </Panel>
  );
}

export function Overview({ data, name, hour, can, scopeLabel }: { data: OverviewPayload; name: string; hour: number; can: (p: Permission) => boolean; scopeLabel: string }) {
  const t = useTranslations("admin.overview");
  const locale = useLocale() as AppLocale;
  const p = dateParts(data.today);
  const greeting = hour < 12 ? t("morning", { name }) : hour < 17 ? t("afternoon", { name }) : t("evening", { name });
  const dateLabel = `${weekdayName(p.dow, locale, "long")}, ${formatIsoDate(data.today, locale)}`;
  const month = data.kpis[0]?.period.label;
  return (
    <div className={styles.page}>
      <PageHead
        eyebrow={dateLabel}
        title={greeting}
        sub={`${scopeLabel}${month ? ` · ${tx(month, locale)}` : ""}`}
        actions={
          can("events.plan") ? (
            <span className={styles.onlyDesk}>
              <Button href="/admin/events/new" icon="plus">
                {t("planEvent")}
              </Button>
            </span>
          ) : undefined
        }
      />
      {data.firstRun ? <Onboarding can={can} /> : null}
      <div className={`${styles.grid} ${styles.gMain}`}>
        <NeedsYou items={data.needsYou} can={can} />
        <QuickActions can={can} />
      </div>
      <div className={`${styles.grid} ${styles.g4}`}>
        {data.kpis.map((k) => (
          <KpiTile
            key={k.key}
            label={tx(k.label, locale)}
            figure={k.figure}
            period={`${tx(k.period.label, locale)} · ${scopeLabel}`}
            icon={KPI_ICON[k.key]}
            sparkline={k.sparkline}
            deltaPct={k.deltaPct}
            note={k.note ? tx(k.note, locale) : undefined}
            compact
          />
        ))}
      </div>
      <div className={`${styles.grid} ${styles.gMain}`}>
        <Upcoming rows={data.upcoming} />
        <SevaBars rows={data.bySevaType} />
      </div>
    </div>
  );
}

const KPI_ICON: Record<string, IconName> = {
  activities: "calendar-days",
  people_served: "users",
  volunteer_hours: "hand-heart",
  reporting_rate: "clipboard-list",
};
