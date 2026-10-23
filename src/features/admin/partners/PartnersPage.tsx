"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { type PartnerAdmin, type PartnerKind, PartnerKind as PartnerKindEnum, adminEndpoints } from "@/contract";
import { Alert } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import { Dialog } from "@/ui/Dialog";
import { EmptyState } from "@/ui/EmptyState";
import { Icon } from "@/ui/Icon";
import { Input } from "@/ui/Input";
import { Pagination } from "@/ui/Pagination";
import { Select } from "@/ui/Select";
import { FilterBar } from "../FilterBar";
import { PageHead, Pill } from "../kit";
import { RowMenu } from "../Menu";
import { Pencil } from "../icons";
import { hrefWith } from "../url";
import { useAction } from "../useAction";
import { useApi } from "../useApi";
import { Loadable, TableFoot, TogRow } from "../parts";
import styles from "../Admin.module.css";

interface Form {
  name: string;
  nameHi: string;
  kind: PartnerKind;
  city: string;
  contact: string;
  showPublicly: boolean;
}
const blank: Form = { name: "", nameHi: "", kind: "hospital", city: "", contact: "", showPublicly: true };

export function PartnersPage() {
  const t = useTranslations("admin.partners");
  const sp = useSearchParams();
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const q = sp.get("q") ?? "";
  const kind = (sp.get("kind") as PartnerKind | null) ?? undefined;
  const showInactive = sp.get("active") === "0";
  const params = Object.fromEntries(sp.entries());
  const api = useApi<PartnerAdmin[], { total: number; page: number; pageSize: number }>(
    adminEndpoints.partners({ q: q || undefined, kind: kind && PartnerKindEnum.options.includes(kind) ? kind : undefined, active: showInactive ? false : true, page, pageSize: 25 }),
  );
  const { run, pending } = useAction();
  const [edit, setEdit] = useState<PartnerAdmin | "new" | null>(null);
  const [f, setF] = useState<Form>(blank);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const open = (row: PartnerAdmin | "new") => {
    setErrors({});
    setF(row === "new" ? blank : { name: row.name, nameHi: row.nameHi ?? "", kind: row.kind, city: row.city, contact: row.contact ?? "", showPublicly: row.showPublicly });
    setEdit(row);
  };

  const save = async () => {
    const e: Record<string, string> = {};
    if (!f.name.trim()) e.name = t("errName");
    if (!f.city.trim()) e.city = t("errCity");
    setErrors(e);
    if (Object.keys(e).length || edit === null) return;
    const body = { name: f.name.trim(), nameHi: f.nameHi.trim() || null, kind: f.kind, city: f.city.trim(), contact: f.contact.trim() || null, showPublicly: f.showPublicly };
    const res =
      edit === "new"
        ? await run(adminEndpoints.partners(), { body }, { key: "save", success: t("saved"), quiet422: true, onReload: api.reload })
        : await run(adminEndpoints.partner(edit.id), { method: "PATCH", body: { ...body, version: edit.version } }, { key: "save", success: t("saved"), quiet422: true, onReload: api.reload });
    if (res.ok) {
      setEdit(null);
      api.reload();
    } else if (res.status === 422) setErrors(res.error.fields ?? { form: res.error.message });
  };

  const setActive = async (row: PartnerAdmin, active: boolean) => {
    const res = await run(adminEndpoints.partner(row.id), { method: "PATCH", body: { active, version: row.version } }, { key: `a-${row.id}`, success: active ? t("reactivated") : t("deactivated"), onReload: api.reload });
    if (res.ok) api.reload();
  };

  return (
    <div className={styles.page}>
      <PageHead
        title={t("title")}
        sub={t("sub")}
        actions={
          <Button icon="plus" onClick={() => open("new")}>
            {t("add")}
          </Button>
        }
      />
      <FilterBar
        fields={[
          { kind: "search", key: "q", label: t("search") },
          { kind: "select", key: "kind", label: t("colKind"), options: PartnerKindEnum.options.map((k) => ({ value: k, label: t(`kind.${k}`) })) },
          { kind: "select", key: "active", label: t("status"), options: [{ value: "0", label: t("inactive") }] },
        ]}
      />
      <Loadable api={api} rows={6}>
        {(rows, meta) => (
          <div className={styles.tblWrap}>
            {rows.length === 0 ? (
              <div className={styles.cardBd}>
                <EmptyState
                  icon="handshake"
                  title={q || kind || showInactive ? t("noMatch") : t("empty")}
                  action={
                    !q && !kind && !showInactive ? (
                      <Button size="sm" icon="plus" onClick={() => open("new")}>
                        {t("add")}
                      </Button>
                    ) : undefined
                  }
                />
              </div>
            ) : (
              <div className={styles.tblScroll}>
                <table className={styles.tbl}>
                  <thead>
                    <tr>
                      <th scope="col">{t("colName")}</th>
                      <th scope="col">{t("colKind")}</th>
                      <th scope="col">{t("colCity")}</th>
                      <th scope="col">{t("colEvents")}</th>
                      <th scope="col">{t("colContact")}</th>
                      <th scope="col">
                        <span className={styles.srOnly}>{t("actions")}</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.id}>
                        <td>
                          <span className={styles.tblT}>{r.name}</span>
                          {r.nameHi ? (
                            <>
                              <br />
                              <span lang="hi" className={styles.tblSub}>
                                {r.nameHi}
                              </span>
                            </>
                          ) : null}
                          {!r.active ? (
                            <>
                              <br />
                              <Pill tone="slate">{t("inactive")}</Pill>
                            </>
                          ) : !r.showPublicly ? (
                            <>
                              <br />
                              <span className={styles.tblSub}>{t("hiddenPublic")}</span>
                            </>
                          ) : null}
                        </td>
                        <td>
                          <Pill tone="blue">{t(`kind.${r.kind}`)}</Pill>
                        </td>
                        <td>{r.city}</td>
                        <td>{r.eventsThisYear}</td>
                        <td>
                          {r.contact ? (
                            <span title={t("internalOnly")}>
                              <Icon name="lock" size={16} /> {r.contact}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td>
                          <RowMenu
                            items={[
                              { icon: Pencil, label: t("edit"), onClick: () => open(r) },
                              "-",
                              r.active ? { label: t("deactivate"), danger: true, onClick: () => setActive(r, false) } : { label: t("reactivate"), onClick: () => setActive(r, true) },
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
                <Pagination page={page} pageSize={meta.pageSize} total={meta.total} href={(n) => hrefWith("/admin/partners", params, { page: n })} />
              </div>
            ) : null}
            <TableFoot>{t("foot")}</TableFoot>
          </div>
        )}
      </Loadable>
      <Dialog
        open={edit !== null}
        onClose={() => setEdit(null)}
        title={edit === "new" ? t("addTitle") : t("editTitle")}
        width={560}
        footer={
          <div className={styles.dialogFoot}>
            <Button variant="ghost" onClick={() => setEdit(null)}>
              {t("cancel")}
            </Button>
            <Button pending={pending === "save"} onClick={save}>
              {t("save")}
            </Button>
          </div>
        }
      >
        <div className={styles.dialogBody}>
          {errors.form ? <Alert tone="error">{errors.form}</Alert> : null}
          <Input label={t("nameEn")} value={f.name} error={errors.name} maxLength={160} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <Input label={t("nameHi")} lang="hi" optional value={f.nameHi} maxLength={160} onChange={(e) => setF({ ...f, nameHi: e.target.value })} />
          <Select label={t("colKind")} value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as PartnerKind })} options={PartnerKindEnum.options.map((k) => ({ value: k, label: t(`kind.${k}`) }))} />
          <Input label={t("colCity")} value={f.city} error={errors.city} maxLength={80} onChange={(e) => setF({ ...f, city: e.target.value })} />
          <Input label={t("contact")} optional hint={t("contactHint")} value={f.contact} maxLength={200} onChange={(e) => setF({ ...f, contact: e.target.value })} />
          <TogRow label={t("showPublic")} desc={t("showPublicDesc")} checked={f.showPublicly} onChange={(v) => setF({ ...f, showPublicly: v })} />
        </div>
      </Dialog>
    </div>
  );
}
