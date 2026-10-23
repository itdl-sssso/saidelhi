"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { type SevaType, type UploadBatch, type UploadOptions, type UploadPreview, type UploadPreviewRow, adminEndpoints, UPLOAD_LIMITS } from "@/contract";
import { Link } from "@/i18n/navigation";
import { type AppLocale, tx } from "@/lib/format";
import { Alert } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import { Icon } from "@/ui/Icon";
import { Input } from "@/ui/Input";
import { Select } from "@/ui/Select";
import { Stepper } from "@/ui/Stepper";
import { PageHead, Pill } from "../kit";
import { useAction } from "../useAction";
import { useApi } from "../useApi";
import { useUpload } from "../useUpload";
import { download } from "../forms/FormsPage";
import { Loadable } from "../parts";
import styles from "../Admin.module.css";
import u from "./Uploads.module.css";

export function UploadWizard() {
  const t = useTranslations("admin.uploads");
  const api = useApi<UploadOptions>(adminEndpoints.uploadOptions());
  return (
    <div className={styles.page}>
      <PageHead title={t("newTitle")} sub={t("newSub")} back={{ href: "/admin/uploads", label: t("back") }} />
      <Loadable api={api} rows={5}>{(o) => <Wizard options={o} />}</Loadable>
    </div>
  );
}

type Phase = "choose" | "file" | "drop" | "check" | "done";
const ORDER: Phase[] = ["choose", "file", "drop", "check", "done"];

function Wizard({ options }: { options: UploadOptions }) {
  const t = useTranslations("admin.uploads");
  const tSeva = useTranslations("seva");
  const locale = useLocale() as AppLocale;
  const sp = useSearchParams();
  const batchId = sp.get("batch");
  const [phase, setPhase] = useState<Phase>(batchId ? "check" : "choose");
  const [seva, setSeva] = useState<SevaType | "">(options.sevaTypes.length === 1 ? options.sevaTypes[0].sevaType : "");
  const [samithi, setSamithi] = useState(options.samithis.length === 1 ? options.samithis[0].id : "");
  const [local, setPreview] = useState<UploadPreview | null>(null);
  const [done, setDone] = useState<UploadBatch | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const resumed = useApi<UploadPreview>(batchId ? adminEndpoints.upload(batchId) : null);

  const preview = local ?? (resumed.status === "ready" ? resumed.data : null);

  const steps = [t("step1"), t("step2"), t("step3"), t("step4"), t("step5")];
  const current = ORDER.indexOf(phase);

  return (
    <div className={styles.stack}>
      <Stepper steps={steps} current={current} label={t("stepsLabel")} />
      {phase === "choose" ? (
        <div className={styles.card}>
          <div className={`${styles.cardBd} ${styles.dialogBody}`}>
            <Select
              label={t("seva")}
              value={seva}
              error={err ?? undefined}
              onChange={(e) => {
                setSeva(e.target.value as SevaType);
                setErr(null);
              }}
              options={[{ value: "", label: t("pickSeva") }, ...options.sevaTypes.map((s) => ({ value: s.sevaType, label: tx(s.label, locale) || tSeva(s.sevaType) }))]}
            />
            {options.samithis.length > 0 ? (
              <Select label={t("samithi")} hint={t("samithiHint")} value={samithi} onChange={(e) => setSamithi(e.target.value)} options={[...(options.samithis.length > 1 ? [{ value: "", label: t("allSamithis") }] : []), ...options.samithis.map((s) => ({ value: s.id, label: `${tx(s.name, locale)} (${s.code})` }))]} />
            ) : null}
            <div>
              <Button
                iconAfter="arrow-right"
                onClick={() => {
                  if (!seva) return setErr(t("errSeva"));
                  setPhase("file");
                }}
              >
                {t("next")}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
      {phase === "file" && seva ? <GetFile seva={seva} samithi={samithi} onBack={() => setPhase("choose")} onNext={() => setPhase("drop")} /> : null}
      {phase === "drop" && seva ? (
        <Drop
          seva={seva}
          samithi={samithi}
          onBack={() => setPhase("file")}
          onPreview={(p) => {
            setPreview(p);
            setPhase("check");
          }}
        />
      ) : null}
      {phase === "check" ? (
        batchId && resumed.status !== "ready" ? (
          <Loadable api={resumed}>{() => null}</Loadable>
        ) : preview ? (
          <Check
            preview={preview}
            onBack={() => {
              setPreview(null);
              setPhase("drop");
            }}
            onDone={(b) => {
              setDone(b);
              setPhase("done");
            }}
          />
        ) : null
      ) : null}
      {phase === "done" && done ? <Done batch={done} /> : null}
    </div>
  );
}

function GetFile({ seva, samithi, onBack, onNext }: { seva: SevaType; samithi: string; onBack: () => void; onNext: () => void }) {
  const t = useTranslations("admin.uploads");
  const { upload, pending } = useUpload();
  const [busy, setBusy] = useState(false);
  const [own, setOwn] = useState(false);
  const [note, setNote] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const ref = useRef<HTMLInputElement>(null);

  const dl = async () => {
    setBusy(true);
    const ok = await download(adminEndpoints.uploadTemplateXlsx({ sevaType: seva, samithi: samithi || undefined }), `${seva}-template.xlsx`);
    setBusy(false);
    if (!ok) setErr(t("errDownload"));
    else {
      setErr(null);
      onNext();
    }
  };
  const sendOwn = async (file: File | undefined) => {
    if (!file) return;
    const p = checkSheet(file);
    if (p) return setErr(t(`err_${p}`));
    const fd = new FormData();
    fd.append("file", file);
    fd.append("sevaType", seva);
    if (note.trim()) fd.append("note", note.trim());
    const res = await upload(adminEndpoints.uploadToInbox(), fd, "inbox");
    if (res.ok) setSent(true);
    else if (res.status === 422) setErr(res.error.message);
  };

  return (
    <div className={styles.card}>
      <div className={`${styles.cardBd} ${styles.dialogBody}`}>
        {err ? <Alert tone="error">{err}</Alert> : null}
        {sent ? (
          <Alert tone="success">
            {t("ownSent")} <Link href="/admin/inbox">{t("toInbox")}</Link>
          </Alert>
        ) : (
          <>
            <p className={styles.sub}>{t("getFileText")}</p>
            <div className={u.actions}>
              <Button pending={busy} onClick={dl}>
                {t("downloadTemplate")}
              </Button>
              <Button variant="outline" onClick={onNext}>
                {t("haveFile")}
              </Button>
            </div>
            <button type="button" className={styles.linkBtn} aria-expanded={own} onClick={() => setOwn(!own)}>
              {t("useOwn")}
            </button>
            {own ? (
              <div className={u.own}>
                <Alert tone="info">{t("ownText")}</Alert>
                <Input label={t("ownNote")} optional value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} />
                <input ref={ref} type="file" className={styles.srOnly} accept={UPLOAD_LIMITS.sheetExt.join(",")} onChange={(e) => sendOwn(e.target.files?.[0])} aria-label={t("ownFile")} />
                <Button variant="outline" icon="upload" pending={pending === "inbox"} onClick={() => ref.current?.click()}>
                  {t("ownFile")}
                </Button>
              </div>
            ) : null}
          </>
        )}
        <div>
          <Button variant="ghost" onClick={onBack}>
            {t("backStep")}
          </Button>
        </div>
      </div>
    </div>
  );
}

type Problem = "type" | "size" | "empty";
function checkSheet(f: File): Problem | null {
  if (f.size === 0) return "empty";
  const okExt = UPLOAD_LIMITS.sheetExt.some((e) => f.name.toLowerCase().endsWith(e));
  if (!okExt) return "type";
  if (f.size > UPLOAD_LIMITS.sheetBytes) return "size";
  return null;
}

function Drop({ seva, samithi, onBack, onPreview }: { seva: SevaType; samithi: string; onBack: () => void; onPreview: (p: UploadPreview) => void }) {
  const t = useTranslations("admin.uploads");
  const { upload, pending } = useUpload();
  const [over, setOver] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);

  const send = async (file: File | undefined) => {
    if (!file) return;
    setName(file.name);
    const p = checkSheet(file);
    if (p) return setErr(t(`err_${p}`));
    setErr(null);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("sevaType", seva);
    if (samithi) fd.append("samithi", samithi);
    const res = await upload<UploadPreview>(adminEndpoints.uploads(), fd, "up");
    if (res.ok) onPreview(res.data);
    else if (res.status === 422) setErr(res.error.fields ? Object.values(res.error.fields)[0] : res.error.message);
  };

  return (
    <div className={styles.card}>
      <div className={`${styles.cardBd} ${styles.dialogBody}`}>
        {err ? <Alert tone="error">{err}</Alert> : null}
        <label
          className={`${u.drop} ${over ? u.over : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            void send(e.dataTransfer.files?.[0]);
          }}
        >
          <input type="file" className={u.dropInput} accept={UPLOAD_LIMITS.sheetExt.join(",")} onChange={(e) => send(e.target.files?.[0])} disabled={pending === "up"} />
          <Icon name="upload" size={24} />
          <b>{pending === "up" ? t("checking", { name: name ?? "" }) : t("dropTitle")}</b>
          <span className={styles.cap}>{t("dropHint", { mb: UPLOAD_LIMITS.sheetBytes / 1024 / 1024, rows: UPLOAD_LIMITS.maxRows })}</span>
        </label>
        <div>
          <Button variant="ghost" onClick={onBack}>
            {t("backStep")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Check({ preview, onBack, onDone }: { preview: UploadPreview; onBack: () => void; onDone: (b: UploadBatch) => void }) {
  const t = useTranslations("admin.uploads");
  const locale = useLocale() as AppLocale;
  const { run, pending } = useAction();
  const c = preview.counts;
  const loadable = c.new + c.updated;
  const bad = c.errors > 0 || c.rejected > 0;

  if (preview.status === "no_changes")
    return (
      <div className={styles.card}>
        <div className={`${styles.cardBd} ${styles.dialogBody}`}>
          <Alert tone="info" title={t("noChanges")}>
            {t("noChangesText", { name: preview.fileName })}
          </Alert>
          <div className={u.actions}>
            <Button variant="outline" href="/admin/uploads">
              {t("toHistory")}
            </Button>
          </div>
        </div>
      </div>
    );

  const confirm = async () => {
    const res = await run<UploadBatch>(adminEndpoints.uploadConfirm(preview.id), { body: { version: preview.version } }, { key: "confirm", refresh: false });
    if (res.ok) onDone(res.data);
  };

  return (
    <div className={styles.stack}>
      <div className={styles.card}>
        <div className={`${styles.cardBd} ${styles.dialogBody}`}>
          <b className={styles.strong}>{preview.fileName}</b>
          <div className={u.sum}>
            <Pill tone="green">{t("rowsOk", { count: c.ok + c.warnings })}</Pill>
            {c.errors > 0 ? <Pill tone="error">{t("rowsBad", { count: c.errors })}</Pill> : null}
            {c.warnings > 0 ? <Pill tone="yellow">{t("rowsWarn", { count: c.warnings })}</Pill> : null}
          </div>
          {bad ? <Alert tone="attention">{t("badText")}</Alert> : null}
          <div className={u.actions}>
            {loadable > 0 ? (
              <Button pending={pending === "confirm"} onClick={confirm}>
                {t("load", { count: loadable })}
              </Button>
            ) : null}
            {bad ? (
              <Button variant="outline" onClick={() => void download(adminEndpoints.uploadErrorsXlsx(preview.id), `${preview.fileName.replace(/\.\w+$/, "")}-problems.xlsx`)}>
                {t("dlErrors")}
              </Button>
            ) : null}
            <Button variant="ghost" onClick={onBack}>
              {t("another")}
            </Button>
          </div>
        </div>
      </div>
      <PreviewRows preview={preview} locale={locale} />
    </div>
  );
}

function PreviewRows({ preview, locale }: { preview: UploadPreview; locale: AppLocale }) {
  const t = useTranslations("admin.uploads");
  const cols = preview.columns.map((x) => x.header);
  const shown = preview.rows;
  if (shown.length === 0) return null;
  return (
    <div className={styles.tblWrap}>
      <div className={styles.tblScroll}>
        <table className={`${styles.tbl} ${u.prevTbl}`}>
          <caption className={styles.srOnly}>{t("previewCaption")}</caption>
          <thead>
            <tr>
              <th scope="col">{t("colRow")}</th>
              {cols.map((h) => (
                <th key={h} scope="col">
                  {h}
                </th>
              ))}
              <th scope="col">{t("colProblem")}</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <PRow key={r.row} r={r} cols={cols} locale={locale} />
            ))}
          </tbody>
        </table>
      </div>
      <ul className={u.cards} aria-label={t("previewCaption")}>
        {shown.map((r) => (
          <li key={r.row} className={`${u.card} ${r.action === "reject" ? u.cardBad : ""}`}>
            <b>{t("rowN", { n: r.row })}</b> <Pill tone={r.action === "reject" ? "error" : r.issues.length ? "yellow" : "green"}>{t(`action.${r.action}`)}</Pill>
            {r.issues.map((i, k) => (
              <p key={k} className={i.level === "error" ? u.msgErr : u.msgWarn}>
                {i.column ? `${i.column}: ` : ""}
                {tx(i.message, locale)}
              </p>
            ))}
          </li>
        ))}
      </ul>
    </div>
  );
}

function PRow({ r, cols, locale }: { r: UploadPreviewRow; cols: string[]; locale: AppLocale }) {
  const t = useTranslations("admin.uploads");
  const level = (h: string) => {
    const hit = r.issues.filter((i) => i.column === h);
    return hit.some((i) => i.level === "error") ? "error" : hit.length ? "warn" : null;
  };
  return (
    <tr>
      <td>
        {r.row} <span className={styles.tblSub}>{t(`action.${r.action}`)}</span>
      </td>
      {cols.map((h) => {
        const l = level(h);
        return (
          <td key={h} className={l === "error" ? u.cellErr : l === "warn" ? u.cellWarn : undefined}>
            {r.cells[h] ?? ""}
          </td>
        );
      })}
      <td>
        {r.issues.map((i, k) => (
          <span key={k} className={i.level === "error" ? u.msgErr : u.msgWarn}>
            {i.column ? `${i.column}: ` : ""}
            {tx(i.message, locale)}
            <br />
          </span>
        ))}
      </td>
    </tr>
  );
}

function Done({ batch }: { batch: UploadBatch }) {
  const t = useTranslations("admin.uploads");
  const c = batch.counts;
  return (
    <div className={styles.stack}>
      <Alert tone="success" title={t("doneTitle")}>
        {t("doneText")}
      </Alert>
      <div className={u.tiles}>
        <Tile n={c.new} l={t("tileNew")} />
        <Tile n={c.updated} l={t("tileUpdated")} />
        <Tile n={c.rejected} l={t("tileRejected")} />
      </div>
      <div className={u.actions}>
        <Button href="/admin/approvals">{t("toApprovals")}</Button>
        <Button variant="outline" href="/admin/uploads">
          {t("toHistory")}
        </Button>
        {c.rejected > 0 ? (
          <Button variant="outline" onClick={() => void download(adminEndpoints.uploadErrorsXlsx(batch.id), `${batch.fileName.replace(/\.\w+$/, "")}-problems.xlsx`)}>
            {t("dlErrors")}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function Tile({ n, l }: { n: number; l: string }) {
  return (
    <div className={u.tile}>
      <span className={u.tileN}>{n}</span>
      <span className={styles.cap}>{l}</span>
    </div>
  );
}
