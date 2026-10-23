"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { type RedirectRow, RedirectSource, adminEndpoints } from "@/contract";
import { formatDate, type AppLocale } from "@/lib/format";
import { Alert } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import { Dialog } from "@/ui/Dialog";
import { EmptyState } from "@/ui/EmptyState";
import { Input } from "@/ui/Input";
import { Pagination } from "@/ui/Pagination";
import { ConfirmDialog } from "../Dialogs";
import { FilterBar } from "../FilterBar";
import { Pill } from "../kit";
import { RowMenu } from "../Menu";
import { Pencil, Trash2 } from "../icons";
import { formatNumber } from "../num";
import { hrefWith } from "../url";
import { useAction } from "../useAction";
import { useApi } from "../useApi";
import { Loadable, TableFoot, TogRow } from "../parts";
import styles from "../Admin.module.css";

export function RedirectsTab() {
  const t = useTranslations("admin.migration");
  const locale = useLocale() as AppLocale;
  const sp = useSearchParams();
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const q = sp.get("q") || undefined;
  const rawSource = sp.get("source") as RedirectSource | null;
  const source = rawSource && RedirectSource.options.includes(rawSource) ? rawSource : undefined;
  const params = Object.fromEntries(sp.entries());
  const api = useApi<RedirectRow[], { total: number; page: number; pageSize: number }>(adminEndpoints.redirects({ q, source, page, pageSize: 25 }));
  const { run, pending } = useAction();
  const [edit, setEdit] = useState<RedirectRow | "new" | null>(null);
  const [del, setDel] = useState<RedirectRow | null>(null);
  const [f, setF] = useState({ from: "", to: "", permanent: true });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const open = (r: RedirectRow | "new") => {
    setErrors({});
    setF(r === "new" ? { from: "", to: "", permanent: true } : { from: r.from, to: r.to, permanent: r.permanent });
    setEdit(r);
  };
  const save = async () => {
    const e: Record<string, string> = {};
    if (!/^\/\S*$/.test(f.from.trim())) e.from = t("errFrom");
    if (!/^(\/\S*|https:\/\/\S+)$/.test(f.to.trim())) e.to = t("errTo");
    setErrors(e);
    if (Object.keys(e).length) return;
    const res = await run(adminEndpoints.redirects(), { body: { from: f.from.trim(), to: f.to.trim(), permanent: f.permanent } }, { key: "rd", success: t("rdSaved"), quiet422: true, onReload: api.reload });
    if (res.ok) {
      setEdit(null);
      api.reload();
    } else if (res.status === 422) setErrors(res.error.fields ?? { form: res.error.message });
  };
  return (
    <div className={styles.tblWrap}>
      <div style={{ display: "flex", justifyContent: "flex-end", paddingBottom: "var(--space-3)" }}>
        <Button icon="plus" onClick={() => open("new")}>
          {t("rdAdd")}
        </Button>
      </div>
      <FilterBar
        fields={[
          { kind: "search", key: "q", label: t("rdSearch") },
          { kind: "select", key: "source", label: t("colSource"), options: RedirectSource.options.map((s) => ({ value: s, label: t(`rdSource.${s}`) })) },
        ]}
      />
      <Loadable api={api} rows={5}>
        {(rows, meta) =>
          rows.length === 0 ? (
            <div className={styles.cardBd}>
              <EmptyState icon="map" title={q || source ? t("rdNoMatch") : t("rdEmpty")} />
            </div>
          ) : (
            <>
              <div className={styles.tblScroll}>
                <table className={styles.tbl}>
                  <thead>
                    <tr>
                      <th scope="col">{t("colOld")}</th>
                      <th scope="col">{t("colNew")}</th>
                      <th scope="col">{t("colKind")}</th>
                      <th scope="col">{t("colSource")}</th>
                      <th scope="col">{t("colHits")}</th>
                      <th scope="col">
                        <span className={styles.srOnly}>{t("actions")}</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.from}>
                        <td style={{ wordBreak: "break-all" }}>
                          <code>{r.from}</code>
                        </td>
                        <td style={{ wordBreak: "break-all" }}>
                          <code>{r.to}</code>
                        </td>
                        <td>{r.permanent ? t("permanent") : t("temporary")}</td>
                        <td>
                          <Pill tone={r.source === "rule" ? "slate" : r.source === "manual" ? "blue" : "green"}>{t(`rdSource.${r.source}`)}</Pill>
                          <br />
                          <span className={styles.tblSub}>{formatDate(r.updatedAt, locale)}</span>
                        </td>
                        <td>{formatNumber(r.hits, locale)}</td>
                        <td>
                          {r.source === "rule" ? (
                            <span className={styles.tblSub}>{t("ruleLocked")}</span>
                          ) : (
                            <RowMenu items={[{ icon: Pencil, label: t("edit"), onClick: () => open(r) }, "-", { icon: Trash2, label: t("delete"), danger: true, onClick: () => setDel(r) }]} />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {meta && meta.total > meta.pageSize ? (
                <div className={styles.pagerWrap}>
                  <Pagination page={page} pageSize={meta.pageSize} total={meta.total} href={(n) => hrefWith("/admin/migration", params, { page: n })} />
                </div>
              ) : null}
              <TableFoot icon="info">{t("rdFoot")}</TableFoot>
            </>
          )
        }
      </Loadable>
      <Dialog
        open={edit !== null}
        onClose={() => setEdit(null)}
        title={edit === "new" ? t("rdAddTitle") : t("rdEditTitle")}
        width={520}
        footer={
          <div className={styles.dialogFoot}>
            <Button variant="ghost" onClick={() => setEdit(null)}>
              {t("cancel")}
            </Button>
            <Button pending={pending === "rd"} onClick={save}>
              {t("save")}
            </Button>
          </div>
        }
      >
        <div className={styles.dialogBody}>
          {errors.form ? <Alert tone="error">{errors.form}</Alert> : null}
          <Input label={t("colOld")} hint={t("fromHint")} value={f.from} error={errors.from} readOnly={edit !== "new"} maxLength={500} onChange={(e) => setF({ ...f, from: e.target.value })} />
          <Input label={t("colNew")} hint={t("toHint")} value={f.to} error={errors.to} maxLength={500} onChange={(e) => setF({ ...f, to: e.target.value })} />
          <TogRow label={t("permanent")} desc={t("permanentDesc")} checked={f.permanent} onChange={(v) => setF({ ...f, permanent: v })} />
        </div>
      </Dialog>
      <ConfirmDialog
        open={del !== null}
        onClose={() => setDel(null)}
        title={t("rdDelTitle")}
        body={t("rdDelBody", { from: del?.from ?? "" })}
        confirmLabel={t("delete")}
        danger
        pending={pending === "del"}
        onConfirm={async () => {
          if (!del) return false;
          const res = await run(adminEndpoints.redirectDelete(del.from), { method: "DELETE" }, { key: "del", success: t("rdDeleted"), onReload: api.reload });
          if (res.ok) api.reload();
          return res.ok;
        }}
      />
    </div>
  );
}
