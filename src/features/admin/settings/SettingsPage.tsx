"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  type FormsPayload,
  type KpiDefinition,
  type SettingsPayload,
  type SevaType,
  type SevaTypeAdmin,
  type UiString,
  type Wing,
  SevaType as SevaTypeEnum,
  Wing as WingEnum,
  adminEndpoints,
} from "@/contract";
import { formatDate, type AppLocale, tx } from "@/lib/format";
import { Alert } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import { Dialog } from "@/ui/Dialog";
import { EmptyState } from "@/ui/EmptyState";
import { icons } from "@/ui/Icon";
import { Input } from "@/ui/Input";
import { Pagination } from "@/ui/Pagination";
import { Select } from "@/ui/Select";
import { Switch } from "@/ui/Switch";
import { FilterBar } from "../FilterBar";
import { PageHead, Panel, Pill } from "../kit";
import { RowMenu } from "../Menu";
import { Pencil } from "../icons";
import { hrefWith } from "../url";
import { useAction } from "../useAction";
import { useApi } from "../useApi";
import { I18nFields, type I18nValue, toI18n } from "../fields";
import { IconDot, LinkTabs, Loadable, Note, TableFoot, TogRow } from "../parts";
import styles from "../Admin.module.css";
import p from "../Parts.module.css";

const TABS = ["seva", "kpis", "strings", "flags", "links", "analytics"] as const;
type TabId = (typeof TABS)[number];

export function SettingsPage() {
  const t = useTranslations("admin.settings");
  const sp = useSearchParams();
  const raw = sp.get("tab") as TabId | null;
  const tab: TabId = raw && TABS.includes(raw) ? raw : "seva";
  const labels = Object.fromEntries(TABS.map((id) => [id, t(`tab.${id}`)])) as Record<TabId, string>;
  return (
    <div className={styles.page}>
      <PageHead title={t("title")} sub={t("sub")} />
      <LinkTabs path="/admin/settings" tabs={TABS} current={tab} label={t("tabsLabel")} labels={labels} />
      {tab === "seva" ? <SevaTypes /> : null}
      {tab === "kpis" ? <Kpis /> : null}
      {tab === "strings" ? <Strings /> : null}
      {(tab === "flags" || tab === "links") && <FlagsAndLinks which={tab} />}
      {tab === "analytics" ? <Analytics /> : null}
    </div>
  );
}

// ---- Seva types -------------------------------------------------------------

const ICON_CHOICES = Object.keys(icons);

interface SevaForm {
  code: SevaType | "";
  label: I18nValue;
  icon: string;
  wing: Wing;
  templateId: string;
}

function SevaTypes() {
  const t = useTranslations("admin.settings");
  const tSeva = useTranslations("seva");
  const locale = useLocale() as AppLocale;
  const api = useApi<SevaTypeAdmin[]>(adminEndpoints.settingsSevaTypes());
  const forms = useApi<FormsPayload>(adminEndpoints.forms());
  const { run, pending } = useAction();
  const [edit, setEdit] = useState<SevaTypeAdmin | "new" | null>(null);
  const [form, setForm] = useState<SevaForm>({ code: "", label: { en: "", hi: null }, icon: "heart", wing: "service", templateId: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const templates = forms.status === "ready" ? forms.data.templates : [];

  const open = (row: SevaTypeAdmin | "new", present: SevaType[]) => {
    setErrors({});
    if (row === "new") {
      const free = SevaTypeEnum.options.find((c) => !present.includes(c)) ?? "";
      setForm({ code: free, label: { en: "", hi: null }, icon: "heart", wing: "service", templateId: "" });
    } else setForm({ code: row.code, label: toI18n(row.label), icon: row.icon, wing: row.wing, templateId: row.template?.id ?? "" });
    setEdit(row);
  };

  const save = async (rows: SevaTypeAdmin[]) => {
    const e: Record<string, string> = {};
    if (!form.label.en.trim()) e.label = t("seva.errName");
    if (!form.code) e.code = t("seva.errCode");
    setErrors(e);
    if (Object.keys(e).length || edit === null) return;
    const label = { en: form.label.en.trim(), hi: form.label.hi?.trim() || null };
    const res =
      edit === "new"
        ? await run(adminEndpoints.settingsSevaTypes(), { body: { code: form.code, label, icon: form.icon, wing: form.wing } }, { key: "save", success: t("saved"), quiet422: true, onReload: api.reload })
        : await run(
            adminEndpoints.settingsSevaType(edit.code),
            { method: "PATCH", body: { label, icon: form.icon, wing: form.wing, templateId: form.templateId || null, version: edit.version } },
            { key: "save", success: t("saved"), quiet422: true, onReload: api.reload },
          );
    if (res.ok) {
      setEdit(null);
      api.reload();
    } else if (res.status === 422) setErrors(res.error.fields ?? { form: res.error.message });
    void rows;
  };

  const toggle = async (row: SevaTypeAdmin, active: boolean) => {
    const res = await run(adminEndpoints.settingsSevaType(row.code), { method: "PATCH", body: { active, version: row.version } }, { key: `a-${row.code}`, success: t("saved"), onReload: api.reload });
    if (res.ok) api.reload();
  };

  return (
    <Loadable api={api}>
      {(rows) => {
        const present = rows.map((r) => r.code);
        const canAdd = present.length < SevaTypeEnum.options.length;
        return (
          <>
            <div className={styles.tblWrap}>
              <div className={styles.tblTools}>
                <span className={styles.cap} style={{ flex: 1 }}>
                  {t("seva.count", { count: rows.length })}
                </span>
                {canAdd ? (
                  <Button size="sm" icon="plus" onClick={() => open("new", present)}>
                    {t("seva.add")}
                  </Button>
                ) : null}
              </div>
              {rows.length === 0 ? (
                <div className={styles.cardBd}>
                  <EmptyState icon="heart-handshake" title={t("seva.empty")} />
                </div>
              ) : (
                <div className={styles.tblScroll}>
                  <table className={styles.tbl}>
                    <thead>
                      <tr>
                        <th scope="col" style={{ width: 56 }}>
                          <span className={styles.srOnly}>{t("seva.colIcon")}</span>
                        </th>
                        <th scope="col">{t("seva.colName")}</th>
                        <th scope="col">{t("seva.colWing")}</th>
                        <th scope="col">{t("seva.colTemplate")}</th>
                        <th scope="col">{t("seva.colPublic")}</th>
                        <th scope="col">
                          <span className={styles.srOnly}>{t("actions")}</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.code}>
                          <td>
                            <IconDot name={r.icon} />
                          </td>
                          <td>
                            <span className={styles.tblT}>{tx(r.label, "en")}</span>
                            <br />
                            {r.label.hi ? (
                              <span lang="hi" className={styles.tblSub}>
                                {r.label.hi}
                              </span>
                            ) : (
                              <Pill tone="yellow">{t("seva.hiMissing")}</Pill>
                            )}
                            <br />
                            <span className={`${styles.tblSub} ${styles.mono}`}>{r.code}</span>
                          </td>
                          <td>{t(`wing.${r.wing}`)}</td>
                          <td>{r.template ? `${tx(r.template.title, locale)}${r.template.version ? ` v${r.template.version}` : ""}` : "—"}</td>
                          <td>
                            <Switch label={<span className={styles.srOnly}>{t("seva.publicOf", { name: tSeva(r.code) })}</span>} checked={r.active} disabled={pending === `a-${r.code}`} onChange={(e) => toggle(r, e.target.checked)} />
                          </td>
                          <td>
                            <RowMenu items={[{ icon: Pencil, label: t("edit"), onClick: () => open(r, present) }]} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <TableFoot>{t("seva.foot")}</TableFoot>
            </div>
            <Dialog
              open={edit !== null}
              onClose={() => setEdit(null)}
              title={edit === "new" ? t("seva.addTitle") : t("seva.editTitle")}
              width={560}
              footer={
                <div className={styles.dialogFoot}>
                  <Button variant="ghost" onClick={() => setEdit(null)}>
                    {t("cancel")}
                  </Button>
                  <Button pending={pending === "save"} onClick={() => save(rows)}>
                    {t("save")}
                  </Button>
                </div>
              }
            >
              <div className={styles.dialogBody}>
                {errors.form ? <Alert tone="error">{errors.form}</Alert> : null}
                <Select
                  label={t("seva.code")}
                  value={form.code}
                  disabled={edit !== "new"}
                  error={errors.code}
                  hint={edit === "new" ? t("seva.codeHint") : undefined}
                  onChange={(e) => setForm({ ...form, code: e.target.value as SevaType })}
                  options={SevaTypeEnum.options.filter((c) => edit === "new" ? !present.includes(c) : c === form.code).map((c) => ({ value: c, label: `${tSeva(c)} (${c})` }))}
                />
                <I18nFields label={t("seva.name")} value={form.label} onChange={(label) => setForm({ ...form, label })} error={errors.label ?? errors["label.en"]} />
                <div className={p.twoCol}>
                  <Select label={t("seva.icon")} value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} options={ICON_CHOICES.map((n) => ({ value: n, label: n }))} />
                  <Select label={t("seva.wing")} value={form.wing} onChange={(e) => setForm({ ...form, wing: e.target.value as Wing })} options={WingEnum.options.map((w) => ({ value: w, label: t(`wing.${w}`) }))} />
                </div>
                {edit !== "new" ? (
                  <Select
                    label={t("seva.template")}
                    value={form.templateId}
                    error={errors.templateId}
                    hint={t("seva.templateHint")}
                    onChange={(e) => setForm({ ...form, templateId: e.target.value })}
                    options={[{ value: "", label: t("seva.noTemplate") }, ...templates.filter((x) => x.sevaType === form.code).map((x) => ({ value: x.id, label: tx(x.title, locale) }))]}
                  />
                ) : null}
              </div>
            </Dialog>
          </>
        );
      }}
    </Loadable>
  );
}

// ---- KPI definitions --------------------------------------------------------

function Kpis() {
  const t = useTranslations("admin.settings");
  const locale = useLocale() as AppLocale;
  const api = useApi<KpiDefinition[]>(adminEndpoints.settingsKpis());
  const { run, pending } = useAction();
  const [row, setRow] = useState<KpiDefinition | null>(null);
  const [f, setF] = useState({ label: { en: "", hi: null } as I18nValue, formula: { en: "", hi: null } as I18nValue, note: { en: "", hi: null } as I18nValue, icon: "heart", publicImpact: true });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const open = (k: KpiDefinition) => {
    setErrors({});
    setF({ label: toI18n(k.label), formula: toI18n(k.formula), note: toI18n(k.note), icon: k.icon, publicImpact: k.publicImpact });
    setRow(k);
  };
  const save = async () => {
    if (!row) return;
    if (!f.label.en.trim()) return setErrors({ label: t("kpi.errLabel") });
    const note = f.note.en.trim() || f.note.hi?.trim() ? { en: f.note.en.trim(), hi: f.note.hi?.trim() || null } : null;
    const res = await run(
      adminEndpoints.settingsKpi(row.key),
      { method: "PATCH", body: { label: { en: f.label.en.trim(), hi: f.label.hi?.trim() || null }, formula: { en: f.formula.en.trim(), hi: f.formula.hi?.trim() || null }, note, icon: f.icon, publicImpact: f.publicImpact, version: row.version } },
      { key: "save", success: t("saved"), quiet422: true, onReload: api.reload },
    );
    if (res.ok) {
      setRow(null);
      api.reload();
    } else if (res.status === 422) setErrors(res.error.fields ?? { form: res.error.message });
  };

  return (
    <Loadable api={api}>
      {(rows) => (
        <>
          <div className={styles.tblWrap}>
            <div className={styles.tblScroll}>
              <table className={styles.tbl}>
                <thead>
                  <tr>
                    <th scope="col">{t("kpi.colCode")}</th>
                    <th scope="col">{t("kpi.colLabel")}</th>
                    <th scope="col">{t("kpi.colHow")}</th>
                    <th scope="col">{t("kpi.colPublic")}</th>
                    <th scope="col">{t("kpi.colNote")}</th>
                    <th scope="col">
                      <span className={styles.srOnly}>{t("actions")}</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((k) => (
                    <tr key={k.key}>
                      <td>
                        <span className={styles.mono}>{k.key}</span>
                      </td>
                      <td>
                        <span className={styles.tblT}>{tx(k.label, locale)}</span>
                        <br />
                        <span className={styles.tblSub}>{tx(k.formula, locale)}</span>
                      </td>
                      <td>
                        {t(`kpi.how.${k.how}`)}
                        <br />
                        <span className={styles.tblSub}>{k.sevaType ? t("kpi.from", { seva: k.sevaType }) : t("kpi.fromAll")}</span>
                      </td>
                      <td>
                        {k.publicImpact ? (
                          <Pill tone="green" icon="eye">
                            {t("kpi.shown")}
                          </Pill>
                        ) : (
                          <Pill tone="slate" icon="eye-off">
                            {t("kpi.hidden")}
                          </Pill>
                        )}
                      </td>
                      <td>
                        <span className={styles.cap}>{k.note ? tx(k.note, locale) : "—"}</span>
                      </td>
                      <td>
                        <RowMenu items={[{ icon: Pencil, label: t("edit"), onClick: () => open(k) }]} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <TableFoot>{t("kpi.foot")}</TableFoot>
          </div>
          <Dialog
            open={row !== null}
            onClose={() => setRow(null)}
            title={t("kpi.editTitle")}
            width={560}
            footer={
              <div className={styles.dialogFoot}>
                <Button variant="ghost" onClick={() => setRow(null)}>
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
              <p className={styles.cap}>
                <span className={styles.mono}>{row?.key}</span> · {t("kpi.codeFixed")}
              </p>
              <I18nFields label={t("kpi.label")} value={f.label} onChange={(label) => setF({ ...f, label })} error={errors.label} />
              <I18nFields label={t("kpi.formula")} value={f.formula} onChange={(formula) => setF({ ...f, formula })} multiline rows={2} requiredEn={false} />
              <I18nFields label={t("kpi.note")} value={f.note} onChange={(note) => setF({ ...f, note })} multiline rows={2} requiredEn={false} />
              <Select label={t("seva.icon")} value={f.icon} onChange={(e) => setF({ ...f, icon: e.target.value })} options={ICON_CHOICES.map((n) => ({ value: n, label: n }))} />
              <Switch label={t("kpi.publicSwitch")} checked={f.publicImpact} onChange={(e) => setF({ ...f, publicImpact: e.target.checked })} />
            </div>
          </Dialog>
        </>
      )}
    </Loadable>
  );
}

// ---- Language strings -------------------------------------------------------

function Strings() {
  const t = useTranslations("admin.settings");
  const sp = useSearchParams();
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const q = sp.get("q") ?? "";
  const missing = sp.get("missing") === "1";
  const api = useApi<UiString[], { total: number; page: number; pageSize: number; missingHi?: number }>(adminEndpoints.settingsStrings({ q: q || undefined, missing: missing || undefined, page, pageSize: 25 }));
  const params = Object.fromEntries(sp.entries());
  return (
    <div className={styles.stack}>
      <FilterBar
        fields={[
          { kind: "search", key: "q", label: t("strings.search") },
          { kind: "select", key: "missing", label: t("strings.filterMissing"), options: [{ value: "1", label: t("strings.hiMissing") }] },
        ]}
      />
      <Loadable api={api} rows={6}>
        {(rows, meta) => (
          <div className={styles.tblWrap}>
            {rows.length === 0 ? (
              <div className={styles.cardBd}>
                <EmptyState icon="languages" title={missing ? t("strings.noneMissing") : t("strings.empty")} />
              </div>
            ) : (
              <div className={styles.tblScroll}>
                <table className={styles.tbl}>
                  <thead>
                    <tr>
                      <th scope="col">{t("strings.colKey")}</th>
                      <th scope="col">{t("strings.colEn")}</th>
                      <th scope="col">{t("strings.colHi")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <StringRow key={r.key} row={r} onSaved={api.reload} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {meta && meta.total > meta.pageSize ? (
              <div className={styles.pagerWrap}>
                <Pagination page={page} pageSize={meta.pageSize} total={meta.total} href={(n) => hrefWith("/admin/settings", params, { page: n })} />
              </div>
            ) : null}
            <TableFoot icon="info">{t("strings.foot")}</TableFoot>
          </div>
        )}
      </Loadable>
    </div>
  );
}

function StringRow({ row, onSaved }: { row: UiString; onSaved: () => void }) {
  const t = useTranslations("admin.settings");
  const { run } = useAction();
  const [hi, setHi] = useState(row.hi ?? "");
  const [en, setEn] = useState(row.en);
  const [err, setErr] = useState<string | null>(null);
  const [editEn, setEditEn] = useState(false);

  const save = async (patch: { hi?: string | null; en?: string | null }) => {
    const res = await run(adminEndpoints.settingsStrings(), { method: "PATCH", body: { key: row.key, ...patch } }, { key: row.key, success: t("saved"), refresh: false, quiet422: true, onReload: onSaved });
    if (res.ok) {
      setErr(null);
      onSaved();
    } else if (res.status === 422) setErr(Object.values(res.error.fields ?? {})[0] ?? res.error.message ?? t("strings.placeholderError"));
  };

  return (
    <tr>
      <td>
        <span className={`${styles.mono} ${styles.nowrap}`}>{row.key}</span>
        {row.overridden ? (
          <>
            <br />
            <Pill tone="blue">{t("strings.edited")}</Pill>
          </>
        ) : null}
      </td>
      <td style={{ minWidth: 200 }}>
        {editEn ? (
          <input
            className={p.inlineIn}
            value={en}
            aria-label={t("strings.enFor", { key: row.key })}
            onChange={(e) => setEn(e.target.value)}
            onBlur={() => {
              setEditEn(false);
              if (en !== row.en && en.trim()) void save({ en });
              else setEn(row.en);
            }}
            autoFocus
          />
        ) : (
          <button type="button" className={styles.linkBtn} style={{ textDecoration: "none", color: "inherit", textAlign: "left" }} onClick={() => setEditEn(true)} aria-label={t("strings.editEn", { key: row.key })}>
            {row.en}
          </button>
        )}
      </td>
      <td style={{ minWidth: 220 }}>
        <input
          lang="hi"
          className={`${p.inlineIn} ${!row.hi && !hi ? p.inlineMissing : ""} ${err ? p.inlineErr : ""}`}
          value={hi}
          placeholder={t("strings.addHi")}
          aria-label={t("strings.hiFor", { key: row.key })}
          aria-invalid={err ? true : undefined}
          onChange={(e) => {
            setHi(e.target.value);
            setErr(null);
          }}
          onBlur={() => {
            if (hi !== (row.hi ?? "")) void save({ hi: hi.trim() ? hi : null });
          }}
        />
        {err ? (
          <div className={p.errTxt} role="alert">
            {err}
          </div>
        ) : null}
      </td>
    </tr>
  );
}

// ---- Flags, link defaults, escalation ---------------------------------------

const REPORT_DAYS = [7, 14, 21, 30];
const OTP_RULES = [
  { attempts: 5, minutes: 10 },
  { attempts: 3, minutes: 15 },
  { attempts: 5, minutes: 30 },
];
const APPROVAL_DAYS = [2, 3, 5, 7];

function FlagsAndLinks({ which }: { which: "flags" | "links" }) {
  const t = useTranslations("admin.settings");
  const api = useApi<SettingsPayload>(adminEndpoints.settings());
  const { run, pending } = useAction();

  const patch = async (s: SettingsPayload, body: Record<string, unknown>, key: string) => {
    const res = await run<SettingsPayload>(adminEndpoints.settings(), { method: "PATCH", body: { ...body, version: s.version } }, { key, success: t("savedLogged"), onReload: api.reload });
    if (res.ok) api.reload();
  };

  return (
    <Loadable api={api}>
      {(s) =>
        which === "flags" ? (
          <Panel title={t("flags.title")}>
            <div className={styles.col}>
              <TogRow
                label={t("flags.discourses")}
                desc={s.flags.discourses ? t("flags.discoursesOn") : t("flags.discoursesOff")}
                checked={s.flags.discourses}
                disabled={pending === "discourses"}
                onChange={(v) => patch(s, { flags: { discourses: v } }, "discourses")}
              />
              <TogRow label={t("flags.offline")} desc={t("flags.offlineDesc")} checked={s.flags.offline_mode} disabled={pending === "offline"} onChange={(v) => patch(s, { flags: { offline_mode: v } }, "offline")} />
              <TogRow label={t("flags.ai")} desc={t("flags.aiDesc")} checked={s.flags.ai_extraction} disabled={pending === "ai"} onChange={(v) => patch(s, { flags: { ai_extraction: v } }, "ai")} />
            </div>
            <Note>{t("logged")}</Note>
          </Panel>
        ) : (
          <Panel title={t("links.title")}>
            <div className={p.twoCol}>
              <Select
                label={t("links.reportExpiry")}
                value={String(s.links.reportLinkDays)}
                disabled={pending === "reportLinkDays"}
                onChange={(e) => patch(s, { links: { reportLinkDays: Number(e.target.value) } }, "reportLinkDays")}
                options={uniq(REPORT_DAYS, s.links.reportLinkDays).map((d) => ({ value: String(d), label: t("links.eventPlus", { n: d }) }))}
              />
              <Select
                label={t("links.desk")}
                value={s.links.deskLink}
                disabled={pending === "deskLink"}
                onChange={(e) => patch(s, { links: { deskLink: e.target.value } }, "deskLink")}
                options={[
                  { value: "event_day", label: t("links.eventDay") },
                  { value: "event_day_plus_1", label: t("links.eventDayPlus1") },
                ]}
              />
              <Select
                label={t("links.otpLock")}
                value={`${s.links.otpMaxAttempts}-${s.links.otpLockMinutes}`}
                disabled={pending === "otp"}
                onChange={(e) => {
                  const [a, m] = e.target.value.split("-").map(Number);
                  void patch(s, { links: { otpMaxAttempts: a, otpLockMinutes: m } }, "otp");
                }}
                options={otpOptions(s).map((r) => ({ value: `${r.attempts}-${r.minutes}`, label: t("links.otpRule", { tries: r.attempts, minutes: r.minutes }) }))}
              />
              <Select
                label={t("links.escalate")}
                value={String(s.escalation.approvalDays)}
                disabled={pending === "esc"}
                onChange={(e) => patch(s, { escalation: { approvalDays: Number(e.target.value) } }, "esc")}
                options={uniq(APPROVAL_DAYS, s.escalation.approvalDays).map((d) => ({ value: String(d), label: t("links.days", { n: d }) }))}
              />
            </div>
            <Note>{t("links.note")}</Note>
          </Panel>
        )
      }
    </Loadable>
  );
}

const uniq = (list: number[], current: number) => (list.includes(current) ? list : [...list, current].sort((a, b) => a - b));
const otpOptions = (s: SettingsPayload) => (OTP_RULES.some((r) => r.attempts === s.links.otpMaxAttempts && r.minutes === s.links.otpLockMinutes) ? OTP_RULES : [...OTP_RULES, { attempts: s.links.otpMaxAttempts, minutes: s.links.otpLockMinutes }]);

// ---- Analytics --------------------------------------------------------------

function Analytics() {
  const t = useTranslations("admin.settings");
  const locale = useLocale() as AppLocale;
  const api = useApi<SettingsPayload>(adminEndpoints.settings());
  return (
    <Loadable api={api}>
      {(s) => (
        <Panel
          title={t("analytics.title")}
          badge={
            s.analytics.enabled ? (
              <Pill tone="green" icon="circle-check">
                {t("analytics.on")}
              </Pill>
            ) : (
              <Pill tone="slate" icon="circle-x">
                {t("analytics.off")}
              </Pill>
            )
          }
        >
          <p className={styles.sub}>{t("analytics.body")}</p>
          <Note>{s.analytics.enabled && s.analytics.lastEventAt ? t("analytics.last", { when: formatDate(s.analytics.lastEventAt, locale) }) : t("analytics.notSetUp")}</Note>
        </Panel>
      )}
    </Loadable>
  );
}

