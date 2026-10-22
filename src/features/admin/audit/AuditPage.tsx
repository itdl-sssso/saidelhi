import { getTranslations } from "next-intl/server";
import type { AuditEntry, AuditQuery } from "@/contract";
import type { AppLocale } from "@/lib/format";
import { EmptyState } from "@/ui/EmptyState";
import { Pagination } from "@/ui/Pagination";
import { FilterBar } from "../FilterBar";
import { PageHead } from "../kit";
import { fmtDateTime } from "../time";
import { hrefWith, type Params } from "../url";
import styles from "../Admin.module.css";
import a from "./Audit.module.css";

type Json = Record<string, unknown>;
const isObj = (v: unknown): v is Json => typeof v === "object" && v !== null && !Array.isArray(v);
const show = (v: unknown): string => (v === null || v === undefined ? "—" : typeof v === "string" ? v : JSON.stringify(v));

function Pairs({ data }: { data: Json }) {
  return (
    <dl className={a.pairs}>
      {Object.entries(data).map(([k, v]) => (
        <div key={k} style={{ display: "contents" }}>
          <dt>{k}</dt>
          <dd>{show(v)}</dd>
        </div>
      ))}
    </dl>
  );
}

function Details({ data, labels }: { data: Json | null; labels: { before: string; after: string; none: string; show: string } }) {
  if (!data || Object.keys(data).length === 0) return <span className={styles.cap}>{labels.none}</span>;
  const { before, after, ...rest } = data;
  return (
    <details className={a.details}>
      <summary>{labels.show}</summary>
      <div className={a.body}>
        {isObj(before) || isObj(after) ? (
          <div className={a.cols}>
            <div>
              <b>{labels.before}</b>
              {isObj(before) ? <Pairs data={before} /> : <span className={styles.cap}>{show(before)}</span>}
            </div>
            <div>
              <b>{labels.after}</b>
              {isObj(after) ? <Pairs data={after} /> : <span className={styles.cap}>{show(after)}</span>}
            </div>
          </div>
        ) : null}
        {Object.keys(rest).length ? <Pairs data={rest} /> : null}
      </div>
    </details>
  );
}

export async function AuditPage({ locale, rows, total, query, sp }: { locale: AppLocale; rows: AuditEntry[]; total: number; query: AuditQuery; sp: Params }) {
  const t = await getTranslations({ locale, namespace: "admin.audit" });
  const tRole = await getTranslations({ locale, namespace: "admin.roles" });
  const roleName = (r: string | null) => (r && ["state_admin", "district_coord", "samithi_coord", "content_editor", "translator", "pii_officer"].includes(r) ? tRole(r as "state_admin") : (r ?? ""));
  const labels = { before: t("before"), after: t("after"), none: t("noDetails"), show: t("showDetails") };
  return (
    <div className={styles.page}>
      <PageHead title={t("title")} sub={t("sub")} />
      <FilterBar
        fields={[
          { kind: "search", key: "action", label: t("fAction") },
          { kind: "search", key: "entity", label: t("fEntity") },
          { kind: "date", key: "from", label: t("from") },
          { kind: "date", key: "to", label: t("to") },
        ]}
      />
      <div className={styles.tblWrap}>
        {rows.length === 0 ? (
          <div className={styles.cardBd}>
            <EmptyState icon="list" title={t("empty")} body={t("emptyBody")} />
          </div>
        ) : (
          <>
            <div className={`${styles.tblScroll} ${styles.onlyDesk}`}>
              <table className={styles.tbl}>
                <thead>
                  <tr>
                    <th scope="col">{t("colTime")}</th>
                    <th scope="col">{t("colWho")}</th>
                    <th scope="col">{t("colAction")}</th>
                    <th scope="col">{t("colItem")}</th>
                    <th scope="col">{t("colDetails")}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} style={{ verticalAlign: "top" }}>
                      <td className={styles.nowrap}>{fmtDateTime(r.at, locale)}</td>
                      <td>
                        <div className={styles.col}>
                          <span className={styles.tblT}>{r.actor.name ?? t("system")}</span>
                          {r.actor.role ? <span className={styles.tblSub}>{roleName(r.actor.role)}</span> : null}
                        </div>
                      </td>
                      <td>
                        <code className={styles.mono}>{r.action}</code>
                      </td>
                      <td>
                        <div className={styles.col}>
                          <span>{r.entity}</span>
                          {r.entityId ? <span className={`${styles.tblSub} ${styles.mono}`}>{r.entityId}</span> : null}
                        </div>
                      </td>
                      <td>
                        <Details data={r.data} labels={labels} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className={`${styles.cards} ${styles.onlyPhone}`} style={{ padding: 12 }}>
              {rows.map((r) => (
                <div className={styles.lcard} key={r.id}>
                  <code className={styles.mono}>{r.action}</code>
                  <span className={styles.cap}>
                    {fmtDateTime(r.at, locale)} · {r.actor.name ?? t("system")}
                    {r.actor.role ? ` (${roleName(r.actor.role)})` : ""}
                  </span>
                  <span className={styles.cap}>
                    {r.entity}
                    {r.entityId ? ` · ${r.entityId}` : ""}
                  </span>
                  <Details data={r.data} labels={labels} />
                </div>
              ))}
            </div>
          </>
        )}
        {total > query.pageSize ? (
          <div className={styles.pagerWrap}>
            <Pagination page={query.page} pageSize={query.pageSize} total={total} href={(p) => hrefWith("/admin/audit", sp, { page: p })} />
          </div>
        ) : null}
      </div>
      <p className={styles.cap}>{t("appendOnly")}</p>
    </div>
  );
}
