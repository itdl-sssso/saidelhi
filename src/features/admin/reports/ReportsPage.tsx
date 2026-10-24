"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { type ExportKind, ExportKind as ExportKindEnum, type MonthlyReport, type Person, type ReportSchedule, type ReportsPayload, SevaType as SevaTypeEnum, adminEndpoints } from "@/contract";
import { formatDate, tx, type AppLocale } from "@/lib/format";
import { Alert } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import { Checkbox } from "@/ui/Checkbox";
import { DateField } from "@/ui/DateField";
import { Dialog } from "@/ui/Dialog";
import { EmptyState } from "@/ui/EmptyState";
import { Input } from "@/ui/Input";
import { Select } from "@/ui/Select";
import { download, downloadPost } from "../download";
import { PageHead, Panel, Pill } from "../kit";
import { formatNumber } from "../num";
import type { OrgOptions } from "../server";
import { useAction } from "../useAction";
import { useApi } from "../useApi";
import { Loadable, Note, TogRow } from "../parts";
import styles from "../Admin.module.css";
import p from "../Parts.module.css";

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const kb = (n: number | null) => (n === null ? "—" : n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

export function ReportsPage({ org }: { org: OrgOptions }) {
  const t = useTranslations("admin.reports");
  const api = useApi<ReportsPayload>(adminEndpoints.reports());
  return (
    <div className={styles.page}>
      <PageHead title={t("title")} sub={t("sub")} />
      <Loadable api={api} rows={5}>{(d) => <Body d={d} org={org} reload={api.reload} />}</Loadable>
    </div>
  );
}

function Body({ d, org, reload }: { d: ReportsPayload; org: OrgOptions; reload: () => void }) {
  const monthlySchedule = d.schedules.find((s) => s.kind === "monthly_state") ?? d.schedules[0] ?? null;
  const scopes = [
    ...(monthlySchedule ? [{ value: monthlySchedule.scope.id, label: monthlySchedule.scope.name }] : []),
    ...org.districts.filter((x) => x.value !== monthlySchedule?.scope.id).map((x) => ({ value: x.value, label: { en: x.label, hi: x.label } })),
  ];
  return (
    <>
      <Monthly d={d} schedule={monthlySchedule} reload={reload} scopeId={monthlySchedule?.scope.id} />
      <ExportForm d={d} scopes={scopes} reload={reload} />
      <Recent d={d} />
      <Schedules d={d} />
    </>
  );
}

function Monthly({ d, schedule, scopeId, reload }: { d: ReportsPayload; schedule: ReportSchedule | null; scopeId?: string; reload: () => void }) {
  const t = useTranslations("admin.reports");
  const locale = useLocale() as AppLocale;
  const { run, pending } = useAction();
  const latest = d.monthly[0] ?? null;
  const [regen, setRegen] = useState(false);
  const [month, setMonth] = useState(() => iso(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1)).slice(0, 7));
  const [fail, setFail] = useState(false);
  const patch = async (body: object, key: string) => {
    if (!schedule) return;
    const res = await run(adminEndpoints.reportSchedule(schedule.id), { method: "PATCH", body: { ...body, version: schedule.version } }, { key, success: t("saved"), onReload: reload });
    if (res.ok) reload();
  };
  const people = useApi<Person[]>(d.can.manageSchedules && schedule ? adminEndpoints.people({ pageSize: 100 }) : null);
  const addable = people.status === "ready" ? people.data.filter((x) => x.email && !schedule?.recipients.some((r) => r.userId === x.id)) : [];
  const [pick, setPick] = useState("");
  return (
    <Panel
      title={t("monthlyTitle")}
      action={
        d.can.manageSchedules ? (
          <Button variant="secondary" size="sm" icon="refresh-cw" onClick={() => setRegen(true)}>
            {t("regenerate")}
          </Button>
        ) : undefined
      }
    >
      <div className={p.migBody}>
        {latest ? (
          <div className={p.repLatest}>
            <div>
              <strong>{monthLabel(latest.month, locale)}</strong>
              <br />
              <span className={styles.cap}>{latest.generatedAt ? t("generated", { when: formatDate(latest.generatedAt, locale), pages: latest.pages ?? 0, size: kb(latest.sizeBytes) }) : t(`mStatus.${latest.status}`)}</span>
            </div>
            <Pill tone={latest.status === "ready" ? "green" : latest.status === "failed" ? "error" : "yellow"}>{t(`mStatus.${latest.status}`)}</Pill>
            {latest.status === "ready" ? (
              <Button
                icon="file-text"
                onClick={async () => {
                  setFail(!(await download(latest.url, `monthly-report-${latest.month}.pdf`)));
                }}
              >
                {t("downloadPdf")}
              </Button>
            ) : null}
          </div>
        ) : (
          <EmptyState icon="file-text" title={t("noMonthly")} />
        )}
        {fail ? <Alert tone="error">{t("downloadFailed")}</Alert> : null}
        {d.monthly.length > 1 ? (
          <ul className={p.repOlder}>
            {d.monthly.slice(1, 7).map((m) => (
              <OlderRow key={m.id} m={m} locale={locale} />
            ))}
          </ul>
        ) : null}
        {schedule ? (
          <>
            <TogRow label={t("auto", { day: schedule.dayOfMonth })} desc={t("autoDesc")} checked={schedule.active} disabled={!d.can.manageSchedules || pending === "active"} onChange={(v) => patch({ active: v }, "active")} />
            <div>
              <span className={styles.cap}>{t("recipients")}</span>
              <ul className={p.chips}>
                {schedule.recipients.length === 0 ? <li className={styles.cap}>{t("noRecipients")}</li> : null}
                {schedule.recipients.map((r) => (
                  <li key={r.userId} className={p.chip}>
                    {r.name}
                    {!r.hasEmail ? <span className={styles.tblSub}> {t("noEmail")}</span> : null}
                    {d.can.manageSchedules ? (
                      <button type="button" aria-label={t("removeRecipient", { name: r.name })} onClick={() => patch({ recipientIds: schedule.recipients.filter((x) => x.userId !== r.userId).map((x) => x.userId) }, "rec")}>
                        ×
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
              {d.can.manageSchedules && addable.length ? (
                <div className={p.chipAdd}>
                  <Select label={t("addRecipient")} value={pick} onChange={(e) => setPick(e.target.value)} options={[{ value: "", label: t("pickPerson") }, ...addable.map((x) => ({ value: x.id, label: x.name }))]} />
                  <Button
                    variant="secondary"
                    disabled={!pick}
                    pending={pending === "rec"}
                    onClick={async () => {
                      await patch({ recipientIds: [...schedule.recipients.map((x) => x.userId), pick] }, "rec");
                      setPick("");
                    }}
                  >
                    {t("add")}
                  </Button>
                </div>
              ) : null}
            </div>
          </>
        ) : null}
      </div>
      <Dialog
        open={regen}
        onClose={() => setRegen(false)}
        title={t("regenTitle")}
        width={440}
        footer={
          <div className={styles.dialogFoot}>
            <Button variant="ghost" onClick={() => setRegen(false)}>
              {t("cancel")}
            </Button>
            <Button
              pending={pending === "regen"}
              onClick={async () => {
                const res = await run(adminEndpoints.monthlyReports(), { body: { month, ...(scopeId ? { scopeId } : {}) } }, { key: "regen", success: t("regenStarted"), onReload: reload });
                if (res.ok) {
                  setRegen(false);
                  reload();
                }
              }}
            >
              {t("regenerate")}
            </Button>
          </div>
        }
      >
        <div className={styles.dialogBody}>
          <Input type="month" label={t("month")} value={month} onChange={(e) => setMonth(e.target.value)} />
          <p className={styles.cap}>{t("regenNote")}</p>
        </div>
      </Dialog>
    </Panel>
  );
}

function OlderRow({ m, locale }: { m: MonthlyReport; locale: AppLocale }) {
  const t = useTranslations("admin.reports");
  return (
    <li className={p.repOlderRow}>
      <span>{monthLabel(m.month, locale)}</span>
      {m.status === "ready" ? (
        <button type="button" className={styles.linkBtn} onClick={() => download(m.url, `monthly-report-${m.month}.pdf`)}>
          {t("downloadPdf")}
        </button>
      ) : (
        <Pill tone="yellow">{t(`mStatus.${m.status}`)}</Pill>
      )}
    </li>
  );
}

const monthLabel = (m: string, locale: AppLocale) => new Intl.DateTimeFormat(locale === "hi" ? "hi-IN" : "en-IN", { month: "long", year: "numeric" }).format(new Date(`${m}-01T00:00:00`));

function ExportForm({ d, scopes, reload }: { d: ReportsPayload; scopes: Array<{ value: string; label: { en: string; hi: string | null } }>; reload: () => void }) {
  const t = useTranslations("admin.reports");
  const tSeva = useTranslations("seva");
  const locale = useLocale() as AppLocale;
  const today = new Date();
  const [kind, setKind] = useState<ExportKind>("event_reports");
  const [scopeId, setScopeId] = useState(scopes[0]?.value ?? "");
  const [from, setFrom] = useState(iso(new Date(today.getFullYear(), today.getMonth(), 1)));
  const [to, setTo] = useState(iso(today));
  const [seva, setSeva] = useState<string[]>([]);
  const [fields, setFields] = useState<Record<ExportKind, string[]>>(() => Object.fromEntries(ExportKindEnum.options.map((k) => [k, d.exportFields.filter((f) => f.kinds.includes(k) && f.default).map((f) => f.key)])) as Record<ExportKind, string[]>);
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const avail = d.exportFields.filter((f) => f.kinds.includes(kind));
  const chosen = fields[kind];
  const toggle = (key: string, on: boolean) => setFields((x) => ({ ...x, [kind]: on ? [...x[kind], key] : x[kind].filter((k) => k !== key) }));

  const submit = async () => {
    const e: Record<string, string> = {};
    if (!scopeId) e.scopeId = t("errScope");
    if (!from || !to || from > to) e.range = t("errRange");
    if (chosen.length === 0) e.fields = t("errFields");
    if (reason.trim().length < 5) e.reason = t("errReason");
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    const res = await downloadPost(adminEndpoints.exports(), { kind, scopeId, from, to, sevaTypes: seva, fields: chosen, reason: reason.trim() }, `${kind}-${from}-${to}.csv`);
    setBusy(false);
    if (res.ok) {
      setReason("");
      reload();
    } else setErrors(res.status === 422 ? (res.fields ?? { form: res.message }) : { form: res.status === 0 ? t("errNetwork") : res.message });
  };

  return (
    <Panel title={t("exportTitle")}>
      <div className={p.migBody}>
        {errors.form ? <Alert tone="error">{errors.form}</Alert> : null}
        <Note icon="shield-check">{t("exportNote")}</Note>
        <div className={p.twoCol}>
          <Select label={t("kind")} value={kind} onChange={(e) => setKind(e.target.value as ExportKind)} options={ExportKindEnum.options.map((k) => ({ value: k, label: t(`kindName.${k}`) }))} />
          <Select label={t("scope")} value={scopeId} error={errors.scopeId} onChange={(e) => setScopeId(e.target.value)} options={scopes.map((s) => ({ value: s.value, label: tx(s.label, locale) }))} />
        </div>
        <div className={p.twoCol}>
          <DateField id="exp-from" label={t("from")} value={from} onChange={setFrom} messages={errors.range ? [{ type: "error", text: errors.range }] : undefined} />
          <DateField id="exp-to" label={t("to")} value={to} onChange={setTo} />
        </div>
        <fieldset className={p.checkGroup}>
          <legend>
            {t("sevaTypes")} <span className={styles.cap}>{t("sevaAll")}</span>
          </legend>
          <div className={p.checkGrid}>
            {SevaTypeEnum.options.map((s) => (
              <Checkbox key={s} label={tSeva(s)} checked={seva.includes(s)} onChange={(e) => setSeva(e.target.checked ? [...seva, s] : seva.filter((x) => x !== s))} />
            ))}
          </div>
        </fieldset>
        <fieldset className={p.checkGroup}>
          <legend>{t("fields")}</legend>
          <div className={p.checkGrid}>
            {avail.map((f) => (
              <Checkbox key={f.key} label={tx(f.label, locale)} checked={chosen.includes(f.key)} onChange={(e) => toggle(f.key, e.target.checked)} />
            ))}
          </div>
          {errors.fields ? <span role="alert" className={p.fieldErr}>{errors.fields}</span> : null}
        </fieldset>
        <Input label={t("reason")} hint={t("reasonHint")} value={reason} error={errors.reason} maxLength={300} onChange={(e) => setReason(e.target.value)} />
        <div className={p.migActions}>
          <Button icon="upload" pending={busy} onClick={submit}>
            {t("download")}
          </Button>
        </div>
      </div>
    </Panel>
  );
}

function Recent({ d }: { d: ReportsPayload }) {
  const t = useTranslations("admin.reports");
  const locale = useLocale() as AppLocale;
  return (
    <Panel title={t("recentTitle")} flush>
      {d.recentExports.length === 0 ? (
        <div className={styles.cardBd}>
          <EmptyState icon="file-text" title={t("recentEmpty")} />
        </div>
      ) : (
        <div className={styles.tblScroll} tabIndex={0}>
          <table className={styles.tbl}>
            <thead>
              <tr>
                <th scope="col">{t("colWhen")}</th>
                <th scope="col">{t("colBy")}</th>
                <th scope="col">{t("kind")}</th>
                <th scope="col">{t("scope")}</th>
                <th scope="col">{t("colRows")}</th>
                <th scope="col">{t("reason")}</th>
              </tr>
            </thead>
            <tbody>
              {d.recentExports.map((x) => (
                <tr key={x.id}>
                  <td>{formatDate(x.at, locale)}</td>
                  <td>{x.by}</td>
                  <td>
                    {t(`kindName.${x.kind}`)}
                    <br />
                    <span className={styles.tblSub}>
                      {formatDate(x.from, locale)} – {formatDate(x.to, locale)}
                    </span>
                  </td>
                  <td>{tx(x.scope.name, locale)}</td>
                  <td>{formatNumber(x.rows, locale)}</td>
                  <td>{x.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

function Schedules({ d }: { d: ReportsPayload }) {
  const t = useTranslations("admin.reports");
  const locale = useLocale() as AppLocale;
  return (
    <Panel title={t("schedulesTitle")} flush>
      {d.schedules.length === 0 ? (
        <div className={styles.cardBd}>
          <EmptyState icon="calendar-clock" title={t("schedulesEmpty")} />
        </div>
      ) : (
        <div className={styles.tblScroll} tabIndex={0}>
          <table className={styles.tbl}>
            <thead>
              <tr>
                <th scope="col">{t("colReport")}</th>
                <th scope="col">{t("scope")}</th>
                <th scope="col">{t("colDay")}</th>
                <th scope="col">{t("colRecipients")}</th>
                <th scope="col">{t("colLast")}</th>
                <th scope="col">{t("colState")}</th>
              </tr>
            </thead>
            <tbody>
              {d.schedules.map((s) => (
                <tr key={s.id}>
                  <td>{t(`schedKind.${s.kind}`)}</td>
                  <td>{tx(s.scope.name, locale)}</td>
                  <td>{t("dayOf", { day: s.dayOfMonth })}</td>
                  <td>{s.recipients.length}</td>
                  <td>{s.lastSentAt ? formatDate(s.lastSentAt, locale) : "—"}</td>
                  <td>
                    <Pill tone={s.active ? "green" : "slate"}>{s.active ? t("on") : t("off")}</Pill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
