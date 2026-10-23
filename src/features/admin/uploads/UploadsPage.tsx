"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { type UploadBatch, type UploadStatus, UploadStatus as StatusEnum, SevaType, adminEndpoints } from "@/contract";
import { Link } from "@/i18n/navigation";
import { formatDate, type AppLocale, tx } from "@/lib/format";
import { Button } from "@/ui/Button";
import { EmptyState } from "@/ui/EmptyState";
import { Pagination } from "@/ui/Pagination";
import { FilterBar } from "../FilterBar";
import { Download as DownloadIcon } from "../icons";
import { PageHead, Pill, type Tone } from "../kit";
import { RowMenu } from "../Menu";
import { hrefWith } from "../url";
import { useApi } from "../useApi";
import { download } from "../download";
import { Loadable } from "../parts";
import styles from "../Admin.module.css";

export const STATUS_TONE: Record<UploadStatus, Tone> = { preview: "yellow", loaded: "green", no_changes: "slate", discarded: "slate", failed: "error" };

export function UploadsPage() {
  const t = useTranslations("admin.uploads");
  const tSeva = useTranslations("seva");
  const locale = useLocale() as AppLocale;
  const sp = useSearchParams();
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const status = StatusEnum.safeParse(sp.get("status")).data;
  const sevaType = SevaType.safeParse(sp.get("sevaType")).data;
  const params = Object.fromEntries(sp.entries());
  const api = useApi<UploadBatch[], { total: number; page: number; pageSize: number }>(adminEndpoints.uploads({ status, sevaType, page, pageSize: 20 }));
  return (
    <div className={styles.page}>
      <PageHead
        title={t("title")}
        sub={t("sub")}
        actions={
          <Button href="/admin/uploads/new" icon="upload">
            {t("start")}
          </Button>
        }
      />
      <FilterBar
        fields={[
          { kind: "select", key: "status", label: t("colStatus"), options: StatusEnum.options.map((s) => ({ value: s, label: t(`status.${s}`) })) },
          { kind: "select", key: "sevaType", label: t("colSeva"), options: SevaType.options.map((s) => ({ value: s, label: tSeva(s) })) },
        ]}
      />
      <Loadable api={api} rows={6}>
        {(rows, meta) => (
          <div className={styles.tblWrap}>
            {rows.length === 0 ? (
              <div className={styles.cardBd}>
                <EmptyState icon="upload" title={status || sevaType ? t("noMatch") : t("empty")} action={!status && !sevaType ? <Button size="sm" href="/admin/uploads/new">{t("start")}</Button> : undefined} />
              </div>
            ) : (
              <div className={styles.tblScroll} tabIndex={0}>
                <table className={styles.tbl}>
                  <thead>
                    <tr>
                      <th scope="col">{t("colFile")}</th>
                      <th scope="col">{t("colSeva")}</th>
                      <th scope="col">{t("colBy")}</th>
                      <th scope="col">{t("colRows")}</th>
                      <th scope="col">{t("colStatus")}</th>
                      <th scope="col">
                        <span className={styles.srOnly}>{t("actions")}</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.id}>
                        <td>
                          <span className={styles.tblT}>{r.fileName}</span>
                          <br />
                          <span className={styles.tblSub}>
                            {formatDate(r.uploadedAt, locale)}
                            {r.samithi ? ` · ${tx(r.samithi.name, locale)}` : ""}
                          </span>
                        </td>
                        <td>{tSeva(r.sevaType)}</td>
                        <td>{r.uploadedBy}</td>
                        <td>{t("counts", { ok: r.counts.new + r.counts.updated + r.counts.unchanged, updated: r.counts.updated, rejected: r.counts.rejected })}</td>
                        <td>
                          <Pill tone={STATUS_TONE[r.status]}>{t(`status.${r.status}`)}</Pill>
                        </td>
                        <td>
                          <RowMenu
                            items={[
                              { label: t("continue"), href: `/admin/uploads/new?batch=${r.id}`, hidden: r.status !== "preview" },
                              { icon: DownloadIcon, label: t("dlErrors"), hidden: r.counts.rejected + r.counts.errors === 0, onClick: () => void download(adminEndpoints.uploadErrorsXlsx(r.id), `${r.fileName.replace(/\.\w+$/, "")}-problems.xlsx`) },
                              { icon: DownloadIcon, label: t("dlOriginal"), onClick: () => void download(adminEndpoints.uploadOriginal(r.id), r.fileName) },
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
                <Pagination page={page} pageSize={meta.pageSize} total={meta.total} href={(n) => hrefWith("/admin/uploads", params, { page: n })} />
              </div>
            ) : null}
          </div>
        )}
      </Loadable>
      <Link href="/admin/approvals" className={styles.linkBtn}>
        {t("toApprovals")}
      </Link>
    </div>
  );
}
