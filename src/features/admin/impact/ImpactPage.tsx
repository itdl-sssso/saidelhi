"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { type ImpactAdminPayload, type ImpactEstimateRow, SevaType as SevaTypeEnum, adminEndpoints } from "@/contract";
import { type AppLocale, tx } from "@/lib/format";
import { Alert } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import { Dialog } from "@/ui/Dialog";
import { EmptyState } from "@/ui/EmptyState";
import { Input } from "@/ui/Input";
import { KpiTile } from "@/ui/KpiTile";
import { Pagination } from "@/ui/Pagination";
import { Select } from "@/ui/Select";
import { ConfirmDialog } from "../Dialogs";
import { FilterBar } from "../FilterBar";
import { I18nFields, type I18nValue, toI18n } from "../fields";
import { PageHead, Panel, Pill } from "../kit";
import { RowMenu } from "../Menu";
import { Pencil, Trash2 } from "../icons";
import type { OrgOptions } from "../server";
import { formatNumber } from "../num";
import { hrefWith } from "../url";
import { useAction } from "../useAction";
import { useApi } from "../useApi";
import { Loadable, Note, TableFoot, TogRow } from "../parts";
import styles from "../Admin.module.css";
import p from "../Parts.module.css";

const MAX_HOME = 4;
interface KpiDraft {
  publicImpact: boolean;
  homeTile: boolean;
  note: I18nValue;
}

export function ImpactPage({ org }: { org: OrgOptions }) {
  const t = useTranslations("admin.impact");
  const api = useApi<ImpactAdminPayload>(adminEndpoints.impactControls());
  return (
    <div className={styles.page}>
      <PageHead title={t("title")} sub={t("sub")} />
      <Loadable api={api} rows={5}>{(d) => <Controls key={d.version} d={d} reload={api.reload} />}</Loadable>
      <Estimates org={org} kpis={api.status === "ready" ? api.data.kpis.map((k) => ({ value: k.key, label: k.label })) : []} />
    </div>
  );
}

function Controls({ d, reload }: { d: ImpactAdminPayload; reload: () => void }) {
  const t = useTranslations("admin.impact");
  const locale = useLocale() as AppLocale;
  const { run, pending } = useAction();
  const init = () => ({
    kpis: Object.fromEntries(d.kpis.map((k) => [k.key, { publicImpact: k.publicImpact, homeTile: k.homeTile, note: toI18n(k.note) }])) as Record<string, KpiDraft>,
    showEstimates: d.showEstimates,
    tip: toI18n(d.estimateTooltip),
  });
  const [s, setS] = useState(init);
  const [base] = useState(() => JSON.stringify(init()));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const dirty = JSON.stringify(s) !== base;
  const homeCount = Object.values(s.kpis).filter((k) => k.homeTile).length;
  const setK = (key: string, patch: Partial<KpiDraft>) => setS((x) => ({ ...x, kpis: { ...x.kpis, [key]: { ...x.kpis[key], ...patch } } }));

  const save = async () => {
    if (!s.tip.en.trim()) return setErrors({ tip: t("errTip") });
    setErrors({});
    const body = {
      kpis: d.kpis.map((k) => ({ key: k.key, publicImpact: s.kpis[k.key].publicImpact, homeTile: s.kpis[k.key].homeTile, note: s.kpis[k.key].note.en.trim() ? { en: s.kpis[k.key].note.en.trim(), hi: s.kpis[k.key].note.hi?.trim() || null } : null })),
      showEstimates: s.showEstimates,
      estimateTooltip: { en: s.tip.en.trim(), hi: s.tip.hi?.trim() || null },
      version: d.version,
    };
    const res = await run(adminEndpoints.impactControls(), { method: "PATCH", body }, { key: "save", success: t("saved"), quiet422: true, onReload: reload });
    if (res.ok) reload();
    else if (res.status === 422) setErrors(res.error.fields ?? { form: res.error.message });
  };

  return (
    <>
      {errors.form ? <Alert tone="error">{errors.form}</Alert> : null}
      <div className={p.impactGrid}>
        <Panel title={t("kpisTitle")} action={<Pill tone={homeCount >= MAX_HOME ? "yellow" : "slate"}>{t("homeCount", { n: homeCount, max: MAX_HOME })}</Pill>}>
          <ul className={p.impactList}>
            {d.kpis.map((k) => {
              const v = s.kpis[k.key];
              return (
                <li key={k.key} className={p.impactRow}>
                  <div className={p.impactHead}>
                    <strong>{tx(k.label, locale)}</strong>
                    <span className={styles.cap}>{k.current.value === null ? "—" : typeof k.current.value === "number" ? formatNumber(k.current.value, locale) : String(k.current.value)}</span>
                  </div>
                  <TogRow label={t("onImpact")} checked={v.publicImpact} onChange={(x) => setK(k.key, { publicImpact: x })} />
                  <TogRow label={t("onHome")} desc={!v.homeTile && homeCount >= MAX_HOME ? t("homeFull") : undefined} checked={v.homeTile} disabled={!v.homeTile && homeCount >= MAX_HOME} onChange={(x) => setK(k.key, { homeTile: x })} />
                  <I18nFields label={t("note")} value={v.note} onChange={(x) => setK(k.key, { note: x })} requiredEn={false} maxLength={300} />
                </li>
              );
            })}
          </ul>
        </Panel>
        <div className={p.impactSide}>
          <Panel title={t("estimatesTitle")}>
            <TogRow label={t("showEstimates")} desc={t("showEstimatesDesc")} checked={s.showEstimates} onChange={(x) => setS((y) => ({ ...y, showEstimates: x }))} />
            <I18nFields label={t("tooltip")} value={s.tip} onChange={(x) => setS((y) => ({ ...y, tip: x }))} multiline rows={2} error={errors.tip ?? errors["estimateTooltip.en"]} maxLength={300} />
          </Panel>
          <Panel title={t("previewTitle")}>
            {d.preview.length === 0 ? (
              <EmptyState icon="chart-column" title={t("previewEmpty")} />
            ) : (
              <div className={p.previewTiles}>
                {d.preview.map((k) => (
                  <KpiTile key={k.key} compact label={tx(k.label, locale)} figure={k.figure} period={tx(k.period.label, locale)} note={k.note ? tx(k.note, locale) : undefined} />
                ))}
              </div>
            )}
            <p className={styles.cap}>{dirty ? t("previewStale") : t("previewNote")}</p>
          </Panel>
        </div>
      </div>
      <div className={p.stickySave}>
        <Button pending={pending === "save"} disabled={!dirty} onClick={save}>
          {t("save")}
        </Button>
        <span className={styles.cap}>{dirty ? t("unsaved") : t("logged")}</span>
      </div>
    </>
  );
}

interface EForm {
  districtId: string;
  year: string;
  month: string;
  sevaType: string;
  kpiKey: string;
  value: string;
  source: string;
  visible: boolean;
}
const blank = (districtId = ""): EForm => ({ districtId, year: String(new Date().getFullYear() - 1), month: "", sevaType: "", kpiKey: "", value: "", source: "", visible: true });

function Estimates({ org, kpis }: { org: OrgOptions; kpis: Array<{ value: string; label: { en: string; hi: string | null } }> }) {
  const t = useTranslations("admin.impact");
  const tSeva = useTranslations("seva");
  const locale = useLocale() as AppLocale;
  const sp = useSearchParams();
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const district = sp.get("district") || undefined;
  const year = Number(sp.get("year")) || undefined;
  const params = Object.fromEntries(sp.entries());
  const api = useApi<ImpactEstimateRow[], { total: number; page: number; pageSize: number }>(adminEndpoints.impactEstimates({ district, year, page, pageSize: 20 }));
  const { run, pending } = useAction();
  const [edit, setEdit] = useState<ImpactEstimateRow | "new" | null>(null);
  const [del, setDel] = useState<ImpactEstimateRow | null>(null);
  const [f, setF] = useState<EForm>(blank());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const kpiOpts = kpis.map((k) => ({ value: k.value, label: tx(k.label, locale) }));
  const open = (r: ImpactEstimateRow | "new") => {
    setErrors({});
    setF(r === "new" ? blank(org.districts[0]?.value ?? "") : { districtId: r.district.id, year: String(r.year), month: r.month ? String(Number(r.month.slice(5))) : "", sevaType: r.sevaType ?? "", kpiKey: r.kpiKey, value: String(r.value), source: r.source, visible: r.visible });
    setEdit(r);
  };
  const save = async () => {
    const e: Record<string, string> = {};
    const y = Number(f.year);
    if (!f.districtId) e.districtId = t("errDistrict");
    if (!Number.isInteger(y) || y < 2000 || y >= new Date().getFullYear()) e.year = t("errYear");
    if (!f.kpiKey) e.kpiKey = t("errKpi");
    if (f.value === "" || !/^\d+$/.test(f.value)) e.value = t("errValue");
    if (!f.source.trim()) e.source = t("errSource");
    setErrors(e);
    if (Object.keys(e).length || edit === null) return;
    const body = { districtId: f.districtId, year: y, month: f.month ? `${y}-${f.month.padStart(2, "0")}` : null, sevaType: f.sevaType || null, kpiKey: f.kpiKey, value: Number(f.value), source: f.source.trim(), visible: f.visible };
    const res = edit === "new" ? await run(adminEndpoints.impactEstimates(), { body }, { key: "est", success: t("estSaved"), quiet422: true, onReload: api.reload }) : await run(adminEndpoints.impactEstimate(edit.id), { method: "PATCH", body }, { key: "est", success: t("estSaved"), quiet422: true, onReload: api.reload });
    if (res.ok) {
      setEdit(null);
      api.reload();
    } else if (res.status === 422) setErrors(res.error.fields ?? { form: res.error.message });
  };
  return (
    <Panel
      title={t("estTable")}
      action={
        org.districts.length ? (
          <Button size="sm" icon="plus" onClick={() => open("new")}>
            {t("estAdd")}
          </Button>
        ) : undefined
      }
      flush
    >
      <div style={{ padding: "var(--space-4)" }}>
        <Note icon="info">{t("estNote")}</Note>
        <FilterBar
          fields={[
            ...(org.districts.length > 1 ? [{ kind: "select" as const, key: "district", label: t("colDistrict"), options: org.districts }] : []),
            { kind: "select", key: "year", label: t("colYear"), options: Array.from({ length: 12 }, (_, i) => String(new Date().getFullYear() - 1 - i)).map((y) => ({ value: y, label: y })) },
          ]}
        />
      </div>
      <Loadable api={api} rows={4}>
        {(rows, meta) =>
          rows.length === 0 ? (
            <div className={styles.cardBd}>
              <EmptyState icon="chart-column" title={district || year ? t("estNoMatch") : t("estEmpty")} />
            </div>
          ) : (
            <>
              <div className={styles.tblScroll} tabIndex={0}>
                <table className={styles.tbl}>
                  <thead>
                    <tr>
                      <th scope="col">{t("colDistrict")}</th>
                      <th scope="col">{t("colPeriod")}</th>
                      <th scope="col">{t("colSeva")}</th>
                      <th scope="col">{t("colKpi")}</th>
                      <th scope="col">{t("colValue")}</th>
                      <th scope="col">{t("colSource")}</th>
                      <th scope="col">
                        <span className={styles.srOnly}>{t("actions")}</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.id}>
                        <td>{tx(r.district.name, locale)}</td>
                        <td>{r.month ?? r.year}</td>
                        <td>{r.sevaType ? tSeva(r.sevaType) : t("allSeva")}</td>
                        <td>{tx(r.kpiLabel, locale)}</td>
                        <td>
                          {formatNumber(r.value, locale)} <Pill tone="yellow">{t("estimateTag")}</Pill>
                          {!r.visible ? (
                            <>
                              <br />
                              <span className={styles.tblSub}>{t("hiddenEst")}</span>
                            </>
                          ) : null}
                        </td>
                        <td>
                          {r.source}
                          <br />
                          <span className={styles.tblSub}>{t("enteredBy", { name: r.enteredBy })}</span>
                        </td>
                        <td>
                          <RowMenu items={[{ icon: Pencil, label: t("edit"), onClick: () => open(r) }, "-", { icon: Trash2, label: t("delete"), danger: true, onClick: () => setDel(r) }]} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {meta && meta.total > meta.pageSize ? (
                <div className={styles.pagerWrap}>
                  <Pagination page={page} pageSize={meta.pageSize} total={meta.total} href={(n) => hrefWith("/admin/impact", params, { page: n })} />
                </div>
              ) : null}
              <TableFoot icon="info">{t("estFoot")}</TableFoot>
            </>
          )
        }
      </Loadable>
      <Dialog
        open={edit !== null}
        onClose={() => setEdit(null)}
        title={edit === "new" ? t("estAddTitle") : t("estEditTitle")}
        width={560}
        footer={
          <div className={styles.dialogFoot}>
            <Button variant="ghost" onClick={() => setEdit(null)}>
              {t("cancel")}
            </Button>
            <Button pending={pending === "est"} onClick={save}>
              {t("save")}
            </Button>
          </div>
        }
      >
        <div className={styles.dialogBody}>
          {errors.form ? <Alert tone="error">{errors.form}</Alert> : null}
          <Select label={t("colDistrict")} value={f.districtId} error={errors.districtId} onChange={(e) => setF({ ...f, districtId: e.target.value })} options={org.districts} />
          <div className={p.twoCol}>
            <Input label={t("colYear")} inputMode="numeric" value={f.year} error={errors.year} maxLength={4} onChange={(e) => setF({ ...f, year: e.target.value })} />
            <Select label={t("month")} value={f.month} onChange={(e) => setF({ ...f, month: e.target.value })} options={[{ value: "", label: t("wholeYear") }, ...Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: new Intl.DateTimeFormat(locale === "hi" ? "hi-IN" : "en-IN", { month: "long" }).format(new Date(2000, i, 1)) }))]} />
          </div>
          <Select label={t("colSeva")} value={f.sevaType} onChange={(e) => setF({ ...f, sevaType: e.target.value })} options={[{ value: "", label: t("allSeva") }, ...SevaTypeEnum.options.map((s) => ({ value: s, label: tSeva(s) }))]} />
          <Select label={t("colKpi")} value={f.kpiKey} error={errors.kpiKey} onChange={(e) => setF({ ...f, kpiKey: e.target.value })} options={[{ value: "", label: t("pickKpi") }, ...kpiOpts]} />
          <Input label={t("colValue")} inputMode="numeric" value={f.value} error={errors.value} maxLength={9} onChange={(e) => setF({ ...f, value: e.target.value })} />
          <Input label={t("colSource")} hint={t("sourceHint")} value={f.source} error={errors.source} maxLength={200} onChange={(e) => setF({ ...f, source: e.target.value })} />
          <TogRow label={t("visible")} checked={f.visible} onChange={(v) => setF({ ...f, visible: v })} />
        </div>
      </Dialog>
      <ConfirmDialog
        open={del !== null}
        onClose={() => setDel(null)}
        title={t("delTitle")}
        body={t("delBody")}
        confirmLabel={t("delete")}
        danger
        pending={pending === "del"}
        onConfirm={async () => {
          if (!del) return false;
          const res = await run(adminEndpoints.impactEstimate(del.id), { method: "DELETE" }, { key: "del", success: t("estDeleted"), onReload: api.reload });
          if (res.ok) api.reload();
          return res.ok;
        }}
      />
    </Panel>
  );
}
