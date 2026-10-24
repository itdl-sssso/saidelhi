"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { type CentreAdminRow, adminEndpoints } from "@/contract";
import { Link, useRouter } from "@/i18n/navigation";
import { formatDate, type AppLocale, tx } from "@/lib/format";
import { EmptyState } from "@/ui/EmptyState";
import { Pagination } from "@/ui/Pagination";
import { FilterBar, type FilterField } from "../FilterBar";
import { PageHead, Pill } from "../kit";
import { RowMenu } from "../Menu";
import { Pencil } from "../icons";
import type { OrgOptions } from "../server";
import { hrefWith } from "../url";
import { useApi } from "../useApi";
import { Lang, Loadable } from "../parts";
import styles from "../Admin.module.css";
import p from "../Parts.module.css";

export function CentresPage({ org, single }: { org: OrgOptions; single: boolean }) {
  const t = useTranslations("admin.centres");
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const sp = useSearchParams();
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const q = sp.get("q") ?? "";
  const district = sp.get("district") || undefined;
  const inactive = sp.get("active") === "0";
  const params = Object.fromEntries(sp.entries());
  const filtered = Boolean(q || district || inactive);
  const api = useApi<CentreAdminRow[], { total: number; page: number; pageSize: number }>(adminEndpoints.centres({ q: q || undefined, district, active: inactive ? false : undefined, page, pageSize: 25 }));

  // A samithi coordinator has exactly one centre: go straight to it.
  useEffect(() => {
    if (single && !filtered && api.status === "ready" && api.data.length === 1) router.replace(`/admin/centres/${api.data[0].id}`);
  }, [single, filtered, api.status, api.data, router]);

  const fields: FilterField[] = [
    { kind: "search", key: "q", label: t("search") },
    ...(org.districts.length > 1 ? [{ kind: "select" as const, key: "district", label: t("colDistrict"), options: org.districts }] : []),
    { kind: "select", key: "active", label: t("status"), options: [{ value: "0", label: t("inactive") }] },
  ];

  return (
    <div className={styles.page}>
      <PageHead title={t("title")} sub={t("sub")} />
      <FilterBar fields={fields} />
      <Loadable api={api} rows={6}>
        {(rows, meta) => (
          <div className={styles.tblWrap}>
            {rows.length === 0 ? (
              <div className={styles.cardBd}>
                <EmptyState icon="map-pin" title={filtered ? t("noMatch") : t("empty")} />
              </div>
            ) : (
              <div className={styles.tblScroll} tabIndex={0}>
                <table className={styles.tbl}>
                  <thead>
                    <tr>
                      <th scope="col">{t("colName")}</th>
                      <th scope="col">{t("colDistrict")}</th>
                      <th scope="col">{t("colGatherings")}</th>
                      <th scope="col">{t("colComplete")}</th>
                      <th scope="col">{t("colUpdated")}</th>
                      <th scope="col">
                        <span className={styles.srOnly}>{t("actions")}</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.id}>
                        <td>
                          <Link href={`/admin/centres/${r.id}`} className={styles.tblT}>
                            {tx(r.name, locale)}
                          </Link>
                          <br />
                          <span className={styles.tblSub}>{tx(r.samithi.name, locale)}</span>
                          {!r.active ? (
                            <>
                              {" "}
                              <Pill tone="slate">{t("inactive")}</Pill>
                            </>
                          ) : null}
                        </td>
                        <td>{tx(r.district.name, locale)}</td>
                        <td>
                          {r.gatherings} · {t("photosN", { count: r.photos })}
                        </td>
                        <td>
                          <span className={p.chips}>
                            {r.hasGeo ? <Pill tone="green">{t("hasPin")}</Pill> : <Pill tone="yellow">{t("noPin")}</Pill>}
                            {r.hasPhone ? null : <Pill tone="yellow">{t("noPhone")}</Pill>}
                            <Lang en hi={r.languages.hi} />
                          </span>
                        </td>
                        <td>{formatDate(r.updatedAt, locale)}</td>
                        <td>
                          <RowMenu
                            items={[
                              { icon: Pencil, label: t("edit"), href: `/admin/centres/${r.id}` },
                              { label: t("viewPublic"), href: `/centres/${r.slug}` },
                            ]}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {meta && meta.total > meta.pageSize ? (
              <div className={styles.pagerWrap}>
                <Pagination page={page} pageSize={meta.pageSize} total={meta.total} href={(n) => hrefWith("/admin/centres", params, { page: n })} />
              </div>
            ) : null}
          </div>
        )}
      </Loadable>
    </div>
  );
}
