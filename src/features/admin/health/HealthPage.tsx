"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { type HealthPayload, type HealthTile, adminEndpoints } from "@/contract";
import { Link } from "@/i18n/navigation";
import { type AppLocale, tx } from "@/lib/format";
import { EmptyState } from "@/ui/EmptyState";
import { Heatmap } from "@/ui/Heatmap";
import { FilterBar } from "../FilterBar";
import { PageHead, Panel, Pill } from "../kit";
import { formatNumber } from "../num";
import type { OrgOptions } from "../server";
import { useApi } from "../useApi";
import { Loadable, Note } from "../parts";
import styles from "../Admin.module.css";
import p from "../Parts.module.css";

const RANGES = ["3", "6", "12"] as const;
const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const SOURCE_COLOR: Record<string, string> = { form: "var(--pink-400)", upload: "var(--yellow-300)", whatsapp: "var(--signal-success, #2f7d4f)", scan: "var(--slate-500, #64748b)", portal: "var(--slate-300, #cbd5e1)" };

export function HealthPage({ org }: { org: OrgOptions }) {
  const t = useTranslations("admin.health");
  const sp = useSearchParams();
  const range = (RANGES as readonly string[]).includes(sp.get("range") ?? "") ? (sp.get("range") as (typeof RANGES)[number]) : "6";
  const scope = sp.get("scope") || undefined;
  const now = new Date();
  const from = monthKey(new Date(now.getFullYear(), now.getMonth() - (Number(range) - 1), 1));
  const api = useApi<HealthPayload>(adminEndpoints.health({ scope, from, to: monthKey(now) }));
  return (
    <div className={styles.page}>
      <PageHead title={t("title")} sub={t("sub")} />
      <FilterBar
        fields={[
          { kind: "select", key: "range", label: t("period"), defaultValue: "6", options: RANGES.map((r) => ({ value: r, label: t("lastMonths", { n: Number(r) }) })) },
          ...(org.districts.length > 1 ? [{ kind: "select" as const, key: "scope", label: t("scope"), options: org.districts }] : []),
        ]}
      />
      <Loadable api={api} rows={6}>{(d) => <Body d={d} />}</Loadable>
    </div>
  );
}

function fmt(tile: HealthTile, locale: AppLocale, v: number | null) {
  if (v === null) return "—";
  const n = formatNumber(Math.round(v * 10) / 10, locale);
  return tile.unit === "pct" ? `${n}%` : n;
}

function Body({ d }: { d: HealthPayload }) {
  const t = useTranslations("admin.health");
  const locale = useLocale() as AppLocale;
  const monthName = (m: string) => new Intl.DateTimeFormat(locale === "hi" ? "hi-IN" : "en-IN", { month: "short" }).format(new Date(`${m}-01T00:00:00`));
  const link = (href: string, label: string) => (
    <Link href={href} className={styles.linkBtn}>
      {label}
    </Link>
  );
  return (
    <>
      <dl className={p.healthTiles}>
        {d.tiles.map((tile) => (
          <div key={tile.key} className={p.healthTile}>
            <dt>{tx(tile.label, locale)}</dt>
            <dd>
              {fmt(tile, locale, tile.value)}
              {tile.unit === "days" && tile.value !== null ? <span className={styles.cap}> {t("days")}</span> : null}
            </dd>
            <dd>
              {tile.delta !== null ? <span className={styles.cap}>{t("delta", { n: `${tile.delta > 0 ? "+" : ""}${formatNumber(Math.round(tile.delta * 10) / 10, locale)}` })}</span> : null}
              {tile.note ? <span className={styles.cap}>{tx(tile.note, locale)}</span> : null}
            </dd>
          </div>
        ))}
      </dl>
      <Panel title={t("rateTitle")}>
        {d.reportingRate.length === 0 ? (
          <EmptyState icon="chart-column" title={t("rateEmpty")} />
        ) : (
          <Heatmap
            caption={t("rateCaption")}
            rowHeader={t("colUnit")}
            columns={d.months.map(monthName)}
            rows={d.reportingRate.map((r) => ({ id: r.unit.id, label: tx(r.unit.name, locale), muted: !r.active, href: <Link href={r.href}>{tx(r.unit.name, locale)}</Link>, cells: r.cells }))}
            emptyText={t("noEvents")}
            legend={{ good: t("lgGood"), ok: t("lgOk"), low: t("lgLow"), poor: t("lgPoor") }}
          />
        )}
        <Note icon="info">{t("rateNote")}</Note>
      </Panel>
      <div className={p.healthGrid}>
        <Panel title={t("pendingTitle")} flush>
          {d.pendingApprovals.length === 0 ? (
            <div className={styles.cardBd}>
              <EmptyState icon="circle-check" title={t("pendingEmpty")} />
            </div>
          ) : (
            <div className={styles.tblScroll} tabIndex={0}>
              <table className={styles.tbl}>
                <thead>
                  <tr>
                    <th scope="col">{t("colUnit")}</th>
                    <th scope="col">{t("colWaiting")}</th>
                    <th scope="col">{t("colOldest")}</th>
                    <th scope="col">
                      <span className={styles.srOnly}>{t("open")}</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {d.pendingApprovals.map((r) => (
                    <tr key={r.unit.id}>
                      <td>{tx(r.unit.name, locale)}</td>
                      <td>{r.waiting}</td>
                      <td>
                        <Pill tone={r.oldestDays > 7 ? "error" : r.oldestDays > 3 ? "yellow" : "slate"}>{t("daysN", { n: r.oldestDays })}</Pill>
                      </td>
                      <td>{link(r.href, t("open"))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
        <Panel title={t("lagTitle")} flush>
          {d.reportLag.length === 0 ? (
            <div className={styles.cardBd}>
              <EmptyState icon="clock" title={t("lagEmpty")} />
            </div>
          ) : (
            <div className={styles.tblScroll} tabIndex={0}>
              <table className={styles.tbl}>
                <thead>
                  <tr>
                    <th scope="col">{t("colUnit")}</th>
                    <th scope="col">{t("colMedian")}</th>
                    <th scope="col">{t("colSlowest")}</th>
                    <th scope="col">
                      <span className={styles.srOnly}>{t("open")}</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {d.reportLag.map((r) => (
                    <tr key={r.unit.id}>
                      <td>{tx(r.unit.name, locale)}</td>
                      <td>{t("daysN", { n: r.medianDays })}</td>
                      <td>{t("daysN", { n: r.slowestDays })}</td>
                      <td>{link(r.href, t("open"))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
      <div className={p.healthGrid}>
        <Panel title={t("uploadsTitle")}>
          {d.uploads.batches === 0 ? (
            <EmptyState icon="upload" title={t("uploadsEmpty")} />
          ) : (
            <div className={p.migBody}>
              <p>{t("uploadsLine", { batches: d.uploads.batches, loaded: formatNumber(d.uploads.rowsLoaded, locale), rejected: formatNumber(d.uploads.rowsRejected, locale) })}</p>
              {d.uploads.rejectsByReason.length === 0 ? (
                <Note icon="circle-check">{t("noRejects")}</Note>
              ) : (
                <ul className={p.bars}>
                  {d.uploads.rejectsByReason.map((r) => {
                    const max = Math.max(...d.uploads.rejectsByReason.map((x) => x.count), 1);
                    return (
                      <li key={r.reason}>
                        <span>{t(`reason.${r.reason}`)}</span>
                        <span className={p.barTrack} aria-hidden="true">
                          <i style={{ width: `${(r.count / max) * 100}%` }} />
                        </span>
                        <strong>{r.count}</strong>
                      </li>
                    );
                  })}
                </ul>
              )}
              <Link href="/admin/uploads" className={styles.linkBtn}>
                {t("seeUploads")}
              </Link>
            </div>
          )}
        </Panel>
        <Panel title={t("channelTitle")}>
          {d.channelMix.length === 0 ? (
            <EmptyState icon="inbox" title={t("channelEmpty")} />
          ) : (
            <div className={p.migBody}>
              <div className={p.stack} role="img" aria-label={d.channelMix.map((c) => `${t(`source.${c.source}`)} ${Math.round(c.pct)}%`).join(", ")}>
                {d.channelMix.map((c) => (
                  <i key={c.source} style={{ width: `${c.pct}%`, background: SOURCE_COLOR[c.source] }} title={`${t(`source.${c.source}`)} ${Math.round(c.pct)}%`} />
                ))}
              </div>
              <ul className={p.stackLegend}>
                {d.channelMix.map((c) => (
                  <li key={c.source}>
                    <i style={{ background: SOURCE_COLOR[c.source] }} aria-hidden="true" />
                    {t(`source.${c.source}`)}: {formatNumber(c.count, locale)} ({Math.round(c.pct)}%)
                  </li>
                ))}
              </ul>
              <p className={styles.cap}>{t("estimateLine", { pct: Math.round(d.estimateShare.pct), n: formatNumber(d.estimateShare.estimated, locale), total: formatNumber(d.estimateShare.total, locale) })}</p>
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}
