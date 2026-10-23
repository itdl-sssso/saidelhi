"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { type VolunteerEventRow, type VolunteerSignup, type VolunteersMeta, adminEndpoints } from "@/contract";
import { Link } from "@/i18n/navigation";
import { formatDate, formatIsoDate, type AppLocale, tx } from "@/lib/format";
import { EmptyState } from "@/ui/EmptyState";
import { Icon } from "@/ui/Icon";
import { Meter } from "@/ui/Meter";
import { Pagination } from "@/ui/Pagination";
import { SkeletonRows } from "@/ui/Skeleton";
import { FilterBar, type FilterField } from "../FilterBar";
import { PageHead, Pill } from "../kit";
import type { OrgOptions } from "../server";
import { hrefWith } from "../url";
import { useAction } from "../useAction";
import { useApi } from "../useApi";
import { ChevronDown, ChevronUp } from "../icons";
import { Loadable, Note, TogRow } from "../parts";
import styles from "../Admin.module.css";
import p from "../Parts.module.css";

const WHEN = ["next30", "upcoming", "past"] as const;
type When = (typeof WHEN)[number];

export function VolunteersPage({ org }: { org: OrgOptions }) {
  const t = useTranslations("admin.volunteers");
  const sp = useSearchParams();
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const rawWhen = sp.get("when") as When | null;
  const when: When = rawWhen && WHEN.includes(rawWhen) ? rawWhen : "next30";
  const samithi = sp.get("samithi") || undefined;
  const params = Object.fromEntries(sp.entries());
  const api = useApi<VolunteerEventRow[], VolunteersMeta>(adminEndpoints.volunteers({ when, samithi, page, pageSize: 12 }));
  const fields: FilterField[] = [
    { kind: "select", key: "when", label: t("when"), options: WHEN.map((w) => ({ value: w, label: t(`when_${w}`) })) },
    ...(org.samithis.length > 1 ? [{ kind: "select" as const, key: "samithi", label: t("samithi"), options: org.samithis }] : []),
  ];
  return (
    <div className={styles.page}>
      <PageHead title={t("title")} sub={t("sub")} actions={api.status === "ready" && api.meta ? <NotifyToggle value={api.meta.notifyOnSignup} onSaved={api.reload} /> : undefined} />
      <FilterBar fields={fields} />
      <Loadable api={api} rows={4}>
        {(rows, meta) => (
          <>
            {rows.length === 0 ? (
              <div className={styles.card}>
                <div className={styles.cardBd}>
                  <EmptyState icon="users" title={t("empty")} />
                </div>
              </div>
            ) : (
              <ul className={p.volList}>
                {rows.map((r) => (
                  <EventVolunteers key={r.event.id} row={r} />
                ))}
              </ul>
            )}
            {meta && meta.total > meta.pageSize ? (
              <div className={styles.pagerWrap}>
                <Pagination page={page} pageSize={meta.pageSize} total={meta.total} href={(n) => hrefWith("/admin/volunteers", params, { page: n })} />
              </div>
            ) : null}
            <Note icon="info">{t("retention")}</Note>
          </>
        )}
      </Loadable>
    </div>
  );
}

function NotifyToggle({ value, onSaved }: { value: boolean; onSaved: () => void }) {
  const t = useTranslations("admin.volunteers");
  const { run, pending } = useAction();
  return (
    <TogRow
      label={t("notify")}
      desc={t("notifyDesc")}
      checked={value}
      disabled={pending === "notify"}
      onChange={async (v) => {
        const res = await run(adminEndpoints.volunteerNotify(), { method: "PATCH", body: { notifyOnSignup: v } }, { key: "notify", success: t("saved"), onReload: onSaved });
        if (res.ok) onSaved();
      }}
    />
  );
}

function EventVolunteers({ row }: { row: VolunteerEventRow }) {
  const t = useTranslations("admin.volunteers");
  const tSeva = useTranslations("seva");
  const locale = useLocale() as AppLocale;
  const [open, setOpen] = useState(false);
  const { event, needed, joined, full } = row;
  const id = `vol-${event.id}`;
  const label = needed ? t("meterOf", { joined, needed }) : t("meterNoTarget", { joined });
  return (
    <li className={p.volCard}>
      <div className={p.volHead}>
        <div className={p.volT}>
          <Link href={`/admin/events/${event.id}`} className={styles.tblT}>
            {tx(event.title, locale)}
          </Link>
          <span className={styles.cap}>
            {tSeva(event.sevaType)} · {formatDate(event.startsAt, locale)} · {tx(event.samithi.name, locale)}
          </span>
        </div>
        <div className={p.volMeter}>
          <Meter value={joined} max={needed} label={label} tone={full ? "green" : "pink"} />
          {full ? <Pill tone="green">{t("full")}</Pill> : null}
          {full && needed !== null && joined > needed ? <Pill tone="yellow">{t("waitlist", { count: joined - needed })}</Pill> : null}
        </div>
        <button type="button" className={styles.linkBtn} aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>
          {open ? t("hide") : t("view")}
          <Icon icon={open ? ChevronUp : ChevronDown} size={16} />
        </button>
      </div>
      {open ? (
        <div id={id} className={p.volBody}>
          <Signups eventId={event.id} deleteOn={row.deleteOn} />
        </div>
      ) : null}
    </li>
  );
}

function Signups({ eventId, deleteOn }: { eventId: string; deleteOn: string }) {
  const t = useTranslations("admin.volunteers");
  const locale = useLocale() as AppLocale;
  const api = useApi<VolunteerSignup[]>(adminEndpoints.volunteerSignups(eventId));
  if (api.status === "loading") return <SkeletonRows rows={3} />;
  return (
    <Loadable api={api}>
      {(rows) =>
        rows.length === 0 ? (
          <EmptyState icon="users" title={t("noSignups")} />
        ) : (
          <>
            <div className={styles.tblScroll}>
              <table className={styles.tbl}>
                <thead>
                  <tr>
                    <th scope="col">{t("colName")}</th>
                    <th scope="col">{t("colPhone")}</th>
                    <th scope="col">{t("colSigned")}</th>
                    <th scope="col">{t("colVia")}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td>
                        {r.firstName} {r.waitlist ? <Pill tone="yellow">{t("waitlistOne")}</Pill> : null}
                      </td>
                      <td className={styles.mono}>{r.phone}</td>
                      <td>{formatDate(r.signedUpAt, locale)}</td>
                      <td>{t(`via_${r.channel}`)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <span className={styles.cap}>{t("deleteOn", { date: formatIsoDate(deleteOn, locale) })}</span>
          </>
        )
      }
    </Loadable>
  );
}
