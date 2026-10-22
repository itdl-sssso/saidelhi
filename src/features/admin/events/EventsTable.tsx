"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { type BulkResendResult, type EventRow, adminEndpoints } from "@/contract";
import { SEVA_ICON } from "@/features/public/seva";
import { Link } from "@/i18n/navigation";
import { type AppLocale, formatDayMonth, tx } from "@/lib/format";
import { Checkbox } from "@/ui/Checkbox";
import { Icon } from "@/ui/Icon";
import { StatusPill } from "@/ui/StatusPill";
import { useToast } from "@/ui/Toast";
import { Button } from "@/ui/Button";
import { SourceBadge, DayChip } from "../kit";
import { RowMenu } from "../Menu";
import { useAction } from "../useAction";
import { ResendButton } from "./ResendButton";
import styles from "../Admin.module.css";

const PUBLIC = new Set(["planned", "awaiting_report", "report_submitted", "approved", "cancelled", "postponed"]);

export function Overdue({ row }: { row: EventRow }) {
  const t = useTranslations("admin.events");
  const locale = useLocale() as AppLocale;
  if (row.overdueDays) {
    return (
      <span className={styles.late}>
        <Icon name="clock" size={16} />
        {t("overdue", { count: row.overdueDays })}
      </span>
    );
  }
  if (row.reportDueAt && (row.status === "awaiting_report" || row.status === "planned")) {
    return <span className={styles.next}>{t("due", { date: formatDayMonth(row.reportDueAt, locale) })}</span>;
  }
  return <span className={styles.cap}>—</span>;
}

export function EventsTable({ rows, sort, sortHref, canPlan, canLinks }: { rows: EventRow[]; sort: string; sortHref: string; canPlan: boolean; canLinks: boolean }) {
  const t = useTranslations("admin.events");
  const tSeva = useTranslations("seva");
  const locale = useLocale() as AppLocale;
  const toast = useToast();
  const { run } = useAction();
  const [sel, setSel] = useState<string[]>([]);
  const all = rows.length > 0 && rows.every((r) => sel.includes(r.id));
  const toggle = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const resendOne = async (id: string) => {
    const res = await run<BulkResendResult>(adminEndpoints.bulkResendLinks(), { body: { eventIds: [id] } });
    if (res.ok) {
      const sent = res.data.results.reduce((n, r) => n + r.resent, 0);
      toast.show({ tone: sent ? "success" : "info", message: sent ? t("resent", { count: sent }) : t("resentNone") });
    }
  };

  const menu = (e: EventRow) => (
    <RowMenu
      items={[
        { icon: "eye", label: t("open"), href: `/admin/events/${e.id}` },
        { icon: "pencil", label: t("edit"), href: `/admin/events/${e.id}/edit`, hidden: !canPlan || !["draft", "awaiting_approval", "planned"].includes(e.status) },
        { icon: "send", label: t("resendLink"), onClick: () => resendOne(e.id), hidden: !canLinks || !["planned", "awaiting_report"].includes(e.status) },
        { icon: "external-link", label: t("viewPublic"), href: `/events/${e.id}`, hidden: !PUBLIC.has(e.status) },
      ]}
    />
  );

  return (
    <>
      {sel.length ? (
        <div className={styles.bulk} role="status">
          <span>{t("selected", { count: sel.length })}</span>
          <span className={styles.grow} />
          {canLinks ? <ResendButton eventIds={sel} label={t("resendBulk")} variant="outline" onDone={() => setSel([])} /> : null}
          <Button variant="ghost" size="sm" onClick={() => setSel([])}>
            {t("clear")}
          </Button>
        </div>
      ) : null}

      <div className={`${styles.tblScroll} ${styles.onlyDesk}`}>
        <table className={styles.tbl}>
          <thead>
            <tr>
              {canLinks ? (
                <th scope="col" className={styles.cb}>
                  <Checkbox label={<span className={styles.srOnly}>{t("selectAll")}</span>} checked={all} onChange={() => setSel(all ? [] : rows.map((r) => r.id))} />
                </th>
              ) : null}
              <th scope="col" aria-sort={sort === "startsAt" ? "ascending" : sort === "-startsAt" ? "descending" : undefined}>
                <Link href={sortHref}>
                  {t("colDate")}
                  <Icon name={sort === "startsAt" ? "arrow-up-right" : "arrow-down"} size={16} />
                </Link>
              </th>
              <th scope="col" className={styles.colEvent}>{t("colEvent")}</th>
              <th scope="col">{t("colSamithi")}</th>
              <th scope="col" className={styles.hideMd}>{t("colDistrict")}</th>
              <th scope="col">{t("colStatus")}</th>
              <th scope="col">{t("colSource")}</th>
              <th scope="col">{t("colReport")}</th>
              <th scope="col" className={styles.hideMd}>{t("colActivity")}</th>
              <th scope="col">
                <span className={styles.srOnly}>{t("actions")}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((e) => (
              <tr key={e.id} aria-selected={sel.includes(e.id)}>
                {canLinks ? (
                  <td className={styles.cb}>
                    <Checkbox label={<span className={styles.srOnly}>{t("selectRow", { title: tx(e.title, locale) })}</span>} checked={sel.includes(e.id)} onChange={() => toggle(e.id)} />
                  </td>
                ) : null}
                <td className={styles.nowrap}>{formatDayMonth(e.startsAt, locale)}</td>
                <td className={styles.colEvent}>
                  <div className={styles.col}>
                    <Link href={`/admin/events/${e.id}`} className={styles.tblT}>
                      {tx(e.title, locale)}
                    </Link>
                    <span className={styles.tblSub}>
                      <Icon name={SEVA_ICON[e.sevaType]} size={16} />
                      {tSeva(e.sevaType)}
                    </span>
                  </div>
                </td>
                <td className={styles.nowrap}>{tx(e.samithi.name, locale)}</td>
                <td className={styles.hideMd}>{tx(e.district.name, locale)}</td>
                <td>
                  <StatusPill status={e.status} />
                </td>
                <td>
                  <SourceBadge source={e.source} />
                </td>
                <td>
                  <Overdue row={e} />
                </td>
                <td className={`${styles.cap} ${styles.nowrap} ${styles.hideMd}`}>{formatDayMonth(e.lastActivityAt, locale)}</td>
                <td>{menu(e)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={`${styles.cards} ${styles.onlyPhone}`} style={{ padding: 12 }}>
        {rows.map((e) => (
          <div className={styles.ecard} key={e.id}>
            <DayChip at={e.startsAt} />
            <div className={styles.ecardBody}>
              <Link href={`/admin/events/${e.id}`} className={styles.tblT}>
                {tx(e.title, locale)}
              </Link>
              <span className={styles.cap}>
                {tx(e.samithi.name, locale)} · {tSeva(e.sevaType)}
              </span>
              <StatusPill status={e.status} />
              <Overdue row={e} />
            </div>
            {menu(e)}
          </div>
        ))}
      </div>
    </>
  );
}
