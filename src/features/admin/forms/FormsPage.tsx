"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import {
  type ChangeRequestUrgency,
  type FormChangeRequest,
  type FormTemplateDetail,
  type FormTemplateRow,
  type FormsPayload,
  ChangeRequestUrgency as UrgencyEnum,
  LinkPurpose,
  SevaType,
  adminEndpoints,
} from "@/contract";
import { useRouter } from "@/i18n/navigation";
import { type AppLocale, formatDayMonth, tx } from "@/lib/format";
import { Alert } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import { Dialog } from "@/ui/Dialog";
import { EmptyState } from "@/ui/EmptyState";
import { Select } from "@/ui/Select";
import { Textarea } from "@/ui/Input";
import { ReasonDialog } from "../Dialogs";
import { Copy, FileSpreadsheet, History } from "../icons";
import { I18nFields, type I18nValue } from "../fields";
import { PageHead, Panel, Pill } from "../kit";
import { RowMenu } from "../Menu";
import { IconDot, Lang, Loadable } from "../parts";
import { useAction } from "../useAction";
import { type UseApi, useApi } from "../useApi";
import { PreviewDialog } from "./FormPreview";
import styles from "../Admin.module.css";
import p from "../Parts.module.css";
import s from "./Forms.module.css";

export function FormsPage() {
  const t = useTranslations("admin.forms");
  const api = useApi<FormsPayload>(adminEndpoints.forms());
  return (
    <div className={styles.page}>
      <Loadable api={api} rows={5}>
        {(data) => <Body data={data} api={api} t={t} />}
      </Loadable>
    </div>
  );
}

type Tr = ReturnType<typeof useTranslations<"admin.forms">>;

function Body({ data, api, t }: { data: FormsPayload; api: UseApi<FormsPayload, undefined>; t: Tr }) {
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const { run, pending } = useAction();
  const [dlg, setDlg] = useState<null | { kind: "new" } | { kind: "dup" | "versions" | "preview" | "request"; row: FormTemplateRow } | { kind: "decline"; req: FormChangeRequest }>(null);
  const close = () => setDlg(null);
  const openReqs = data.changeRequests.filter((r) => r.status === "open");

  const toBuilder = (id: string) => router.push(`/admin/forms/${id}/edit`);

  const startDraft = async (r: FormChangeRequest) => {
    const res = await run(adminEndpoints.changeRequest(r.id), { method: "PATCH", body: { status: "drafted" } }, { key: `d-${r.id}`, refresh: false, onReload: api.reload });
    if (res.ok) toBuilder(r.templateId);
  };

  return (
    <>
      <PageHead title={t("title")} sub={data.can.build ? t("sub") : t("subDistrict")} actions={data.can.build ? <Button icon="plus" onClick={() => setDlg({ kind: "new" })}>{t("new")}</Button> : null} />

      {data.can.build && openReqs.length > 0 ? (
        <Panel title={t("requests.title")} badge={<Pill tone="pink">{openReqs.length}</Pill>}>
          <ul className={s.reqs}>
            {openReqs.map((r) => (
              <li key={r.id} className={s.req}>
                <div className={s.reqT}>
                  <b className={styles.strong}>
                    {tx(r.templateTitle, locale)} · {r.from ? tx(r.from.name, locale) : r.by}
                  </b>
                  <span>{r.text}</span>
                  <span className={styles.cap}>
                    {r.by} · {formatDayMonth(r.createdAt, locale)} · {t(`urgency.${r.urgency}`)}
                  </span>
                </div>
                <div className={s.reqA}>
                  <Button size="sm" variant="ghost" onClick={() => setDlg({ kind: "decline", req: r })}>
                    {t("requests.decline")}
                  </Button>
                  <Button size="sm" pending={pending === `d-${r.id}`} onClick={() => startDraft(r)}>
                    {t("requests.start")}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      {data.templates.length === 0 ? (
        <div className={styles.card}>
          <div className={styles.cardBd}>
            <EmptyState icon="file-text" title={t("empty")} body={t("emptyBody")} />
          </div>
        </div>
      ) : (
        <ul className={s.grid} style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {data.templates.map((r) => (
            <li key={r.id} className={s.tcard}>
              <div className={s.tcardHd}>
                <IconDot name={r.icon} />
                <div className={s.tcardT}>
                  <h2 className={s.tcardName}>{tx(r.title, locale)}</h2>
                  <span className={styles.cap}>{versionText(r, t, locale)}</span>
                </div>
                <RowMenu
                  items={[
                    { icon: History, label: t("versions"), onClick: () => setDlg({ kind: "versions", row: r }) },
                    { icon: FileSpreadsheet, label: t("downloadXlsx"), href: undefined, onClick: () => download(adminEndpoints.formTemplateXlsx(r.id), `${r.code}.xlsx`) },
                    { icon: Copy, label: t("duplicate"), onClick: () => setDlg({ kind: "dup", row: r }), hidden: !data.can.build },
                  ]}
                />
              </div>
              <dl className={s.facts}>
                <dt>{t("fields")}</dt>
                <dd>{r.fieldCount}</dd>
                <dt>{t("languages")}</dt>
                <dd>
                  <Lang {...r.languages} />
                  {r.missingHi > 0 ? <span className={styles.cap}> · {t("missingHi", { count: r.missingHi })}</span> : null}
                </dd>
                <dt>{t("usedBy")}</dt>
                <dd>{t("events", { count: r.eventsThisYear })}</dd>
              </dl>
              <div className={s.tcardFoot}>
                {data.can.build ? (
                  <Button size="sm" href={`/admin/forms/${r.id}/edit`}>
                    {t("openBuilder")}
                  </Button>
                ) : null}
                {data.can.requestChange && !data.can.build ? (
                  <Button size="sm" variant="outline" onClick={() => setDlg({ kind: "request", row: r })}>
                    {t("requestChange")}
                  </Button>
                ) : null}
                <Button size="sm" variant="ghost" icon="eye" onClick={() => setDlg({ kind: "preview", row: r })}>
                  {t("preview")}
                </Button>
                {!r.active ? <Pill tone="slate">{t("inactive")}</Pill> : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      {!data.can.build && data.changeRequests.length > 0 ? (
        <Panel title={t("requests.mine")}>
          <ul className={s.reqs}>
            {data.changeRequests.map((r) => (
              <li key={r.id} className={s.req}>
                <div className={s.reqT}>
                  <b className={styles.strong}>{tx(r.templateTitle, locale)}</b>
                  <span>{r.text}</span>
                  {r.note ? <span className={styles.cap}>{t("requests.note", { note: r.note })}</span> : null}
                </div>
                <Pill tone={r.status === "open" ? "yellow" : r.status === "drafted" ? "green" : "slate"}>{t(`requests.status.${r.status}`)}</Pill>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      {dlg?.kind === "new" ? <NewTemplate templates={data.templates} onClose={close} onCreated={toBuilder} /> : null}
      {dlg?.kind === "dup" ? <DuplicateDialog row={dlg.row} onClose={close} onCreated={toBuilder} /> : null}
      {dlg?.kind === "versions" ? <VersionsDialog row={dlg.row} onClose={close} /> : null}
      {dlg?.kind === "preview" ? <PreviewLoader row={dlg.row} onClose={close} /> : null}
      {dlg?.kind === "request" ? <RequestDialog row={dlg.row} onClose={close} onDone={api.reload} /> : null}
      {dlg?.kind === "decline" ? (
        <ReasonDialog
          open
          onClose={close}
          title={t("requests.declineTitle")}
          label={t("requests.declineNote")}
          confirmLabel={t("requests.decline")}
          pending={pending === "decline"}
          onSubmit={async (note) => {
            const res = await run(adminEndpoints.changeRequest(dlg.req.id), { method: "PATCH", body: { status: "declined", ...(note ? { note } : {}) } }, { key: "decline", success: t("requests.declined"), refresh: false, onReload: api.reload });
            if (res.ok) api.reload();
            return res.ok;
          }}
        />
      ) : null}
    </>
  );
}

function versionText(r: FormTemplateRow, t: Tr, locale: AppLocale) {
  if (r.draft && !r.current) return t("draftOnly", { n: r.draft.version });
  if (r.draft) return t("currentAndDraft", { n: r.current!.version, date: formatDayMonth(r.current!.publishedAt, locale), draft: r.draft.version });
  if (r.current) return t("current", { n: r.current.version, date: formatDayMonth(r.current.publishedAt, locale) });
  return t("unpublished");
}

/** Authenticated file download through fetch (the portal cookies are same-origin). */
export async function download(url: string, name: string) {
  const res = await fetch(url, { credentials: "same-origin" });
  if (!res.ok) return false;
  const blob = await res.blob();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  return true;
}

function NewTemplate({ templates, onClose, onCreated }: { templates: FormTemplateRow[]; onClose: () => void; onCreated: (id: string) => void }) {
  const t = useTranslations("admin.forms");
  const tSeva = useTranslations("seva");
  const locale = useLocale() as AppLocale;
  const { run, pending } = useAction();
  const [title, setTitle] = useState<I18nValue>({ en: "", hi: null });
  const [seva, setSeva] = useState("");
  const [purpose, setPurpose] = useState<string>("report");
  const [from, setFrom] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const submit = async () => {
    if (!title.en.trim()) return setErr(t("errTitle"));
    const res = await run<FormTemplateDetail>(
      adminEndpoints.forms(),
      { body: { title: { en: title.en.trim(), hi: title.hi?.trim() || null }, sevaType: seva || null, purpose, ...(from ? { fromTemplateId: from } : {}) } },
      { key: "new", refresh: false, quiet422: true },
    );
    if (res.ok) onCreated(res.data.template.id);
    else if (res.status === 422) setErr(Object.values(res.error.fields ?? {})[0] ?? res.error.message);
  };
  return (
    <Dialog
      open
      onClose={onClose}
      title={t("newTitle")}
      width={520}
      footer={
        <div className={styles.dialogFoot}>
          <Button variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button pending={pending === "new"} onClick={submit}>
            {t("create")}
          </Button>
        </div>
      }
    >
      <div className={styles.dialogBody}>
        {err ? <Alert tone="error">{err}</Alert> : null}
        <I18nFields label={t("name")} value={title} onChange={(v) => (setTitle(v), setErr(null))} />
        <div className={p.twoCol}>
          <Select label={t("sevaType")} value={seva} onChange={(e) => setSeva(e.target.value)} options={[{ value: "", label: t("noSeva") }, ...SevaType.options.map((c) => ({ value: c, label: tSeva(c) }))]} />
          <Select label={t("purpose")} value={purpose} onChange={(e) => setPurpose(e.target.value)} options={LinkPurpose.options.map((x) => ({ value: x, label: t(`purposes.${x}`) }))} />
        </div>
        <Select label={t("startFrom")} value={from} onChange={(e) => setFrom(e.target.value)} options={[{ value: "", label: t("startEmpty") }, ...templates.map((x) => ({ value: x.id, label: tx(x.title, locale) }))]} hint={t("startHint")} />
      </div>
    </Dialog>
  );
}

function DuplicateDialog({ row, onClose, onCreated }: { row: FormTemplateRow; onClose: () => void; onCreated: (id: string) => void }) {
  const t = useTranslations("admin.forms");
  const locale = useLocale() as AppLocale;
  const { run, pending } = useAction();
  const [title, setTitle] = useState<I18nValue>({ en: `${row.title.en} (copy)`, hi: row.title.hi ? `${row.title.hi} (प्रति)` : null });
  const [err, setErr] = useState<string | null>(null);
  const submit = async () => {
    if (!title.en.trim()) return setErr(t("errTitle"));
    const res = await run<FormTemplateDetail>(adminEndpoints.formAction(row.id, "duplicate"), { body: { title: { en: title.en.trim(), hi: title.hi?.trim() || null } } }, { key: "dup", refresh: false, quiet422: true });
    if (res.ok) onCreated(res.data.template.id);
    else if (res.status === 422) setErr(Object.values(res.error.fields ?? {})[0] ?? res.error.message);
  };
  return (
    <Dialog
      open
      onClose={onClose}
      title={t("dupTitle", { name: tx(row.title, locale) })}
      width={520}
      footer={
        <div className={styles.dialogFoot}>
          <Button variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button pending={pending === "dup"} onClick={submit}>
            {t("duplicate")}
          </Button>
        </div>
      }
    >
      <div className={styles.dialogBody}>
        {err ? <Alert tone="error">{err}</Alert> : null}
        <p className={styles.cap}>{t("dupBody")}</p>
        <I18nFields label={t("name")} value={title} onChange={(v) => (setTitle(v), setErr(null))} />
      </div>
    </Dialog>
  );
}

function VersionsDialog({ row, onClose }: { row: FormTemplateRow; onClose: () => void }) {
  const t = useTranslations("admin.forms");
  const locale = useLocale() as AppLocale;
  const api = useApi<FormTemplateDetail>(adminEndpoints.form(row.id));
  return (
    <Dialog
      open
      onClose={onClose}
      title={t("versionsTitle", { name: tx(row.title, locale) })}
      width={520}
      footer={
        <div className={styles.dialogFoot}>
          <Button variant="ghost" onClick={onClose}>
            {t("close")}
          </Button>
        </div>
      }
    >
      <Loadable api={api} rows={3}>
        {(d) => (
          <>
            <ul className={s.vers}>
              {d.versions.map((v) => (
                <li key={v.version}>
                  <span>
                    <b className={styles.strong}>v{v.version}</b> · {v.status === "draft" ? t("draft") : t("publishedOn", { date: v.publishedAt ? formatDayMonth(v.publishedAt, locale) : "—", by: v.publishedBy ?? "—" })}
                  </span>
                  <span className={styles.cap}>
                    {t("fieldsN", { count: v.fieldCount })} · {t("linksUsing", { count: v.linksUsing })}
                  </span>
                </li>
              ))}
            </ul>
            <p className={styles.cap}>{t("versionRule")}</p>
          </>
        )}
      </Loadable>
    </Dialog>
  );
}

function PreviewLoader({ row, onClose }: { row: FormTemplateRow; onClose: () => void }) {
  const api = useApi<FormTemplateDetail>(adminEndpoints.form(row.id));
  return <PreviewDialog open onClose={onClose} def={api.status === "ready" ? (api.data.draft ?? api.data.published) : null} />;
}

function RequestDialog({ row, onClose, onDone }: { row: FormTemplateRow; onClose: () => void; onDone: () => void }) {
  const t = useTranslations("admin.forms");
  const locale = useLocale() as AppLocale;
  const { run, pending } = useAction();
  const [text, setText] = useState("");
  const [urgency, setUrgency] = useState<ChangeRequestUrgency>("no_rush");
  const [err, setErr] = useState<string | null>(null);
  const submit = async () => {
    if (text.trim().length < 5) return setErr(t("requests.errText"));
    const res = await run(adminEndpoints.formChangeRequests(row.id), { body: { text: text.trim(), urgency } }, { key: "req", success: t("requests.sent"), refresh: false, quiet422: true });
    if (res.ok) {
      onDone();
      onClose();
    } else if (res.status === 422) setErr(Object.values(res.error.fields ?? {})[0] ?? res.error.message);
  };
  return (
    <Dialog
      open
      onClose={onClose}
      title={t("requests.dialogTitle", { name: tx(row.title, locale) })}
      width={500}
      footer={
        <div className={styles.dialogFoot}>
          <Button variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button pending={pending === "req"} onClick={submit}>
            {t("requests.send")}
          </Button>
        </div>
      }
    >
      <div className={styles.dialogBody}>
        <Textarea label={t("requests.what")} hint={t("requests.whatHint")} value={text} rows={5} error={err ?? undefined} onChange={(e) => (setText(e.target.value), setErr(null))} maxLength={1000} />
        <Select label={t("requests.urgency")} value={urgency} onChange={(e) => setUrgency(e.target.value as ChangeRequestUrgency)} options={UrgencyEnum.options.map((u) => ({ value: u, label: t(`urgency.${u}`) }))} />
      </div>
    </Dialog>
  );
}
