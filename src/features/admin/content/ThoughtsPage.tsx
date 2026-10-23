"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { type ContentItemEditor, type ThoughtDay, type ThoughtsImportResult, adminEndpoints } from "@/contract";
import { Link } from "@/i18n/navigation";
import { type AppLocale, formatIsoDate, tx } from "@/lib/format";
import { Alert } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import { cx } from "@/ui/cx";
import { Dialog } from "@/ui/Dialog";
import { I18nFields, type I18nValue, emptyI18n, toI18n } from "../fields";
import { PageHead } from "../kit";
import { useAction } from "../useAction";
import { useApi } from "../useApi";
import { useUpload } from "../useUpload";
import { Loadable, Note } from "../parts";
import styles from "../Admin.module.css";
import c from "./Content.module.css";

const DAYS = 14;
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const addDays = (s: string, n: number) => {
  const d = new Date(`${s}T00:00:00`);
  d.setDate(d.getDate() + n);
  return iso(d);
};

export function ThoughtsPage() {
  const t = useTranslations("admin.content");
  const locale = useLocale() as AppLocale;
  const sp = useSearchParams();
  const today = iso(new Date());
  const rawFrom = sp.get("from");
  const from = rawFrom && /^\d{4}-\d{2}-\d{2}$/.test(rawFrom) ? rawFrom : today;
  const to = addDays(from, DAYS - 1);
  const api = useApi<ThoughtDay[]>(adminEndpoints.thoughts({ from, to }));
  const { run, pending } = useAction();
  const { upload, pending: importing } = useUpload();
  const [edit, setEdit] = useState<ThoughtDay | null>(null);
  const [text, setText] = useState<I18nValue>(emptyI18n());
  const [source, setSource] = useState<I18nValue>(emptyI18n());
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<ThoughtsImportResult | null>(null);
  const file = useRef<HTMLInputElement>(null);

  const open = (d: ThoughtDay) => {
    setErr(null);
    setText(d.item ? toI18n(d.item.body) : emptyI18n());
    setSource(d.item ? toI18n(d.item.source) : emptyI18n());
    setEdit(d);
  };
  const save = async () => {
    if (!edit) return;
    if (!text.en.trim()) return setErr(t("errText"));
    const body = { en: text.en.trim(), hi: text.hi?.trim() || null };
    const src = source.en.trim() ? { en: source.en.trim(), hi: source.hi?.trim() || null } : null;
    let item = edit.item;
    if (!item) {
      const made = await run<ContentItemEditor>(adminEndpoints.content(), { body: { kind: "item", type: "thought_for_day", date: edit.date, body, source: src } }, { key: "save", quiet422: true, refresh: false });
      if (!made.ok) return made.status === 422 ? setErr(made.error.message) : undefined;
      item = made.data;
    }
    const res = await run(adminEndpoints.contentItem(item.id), { method: "PATCH", body: { body, source: src, date: edit.date, status: "published", version: item.version } }, { key: "save", success: t("saved"), quiet422: true, onReload: api.reload });
    if (res.ok) {
      setEdit(null);
      api.reload();
    } else if (res.status === 422) setErr(res.error.message);
  };
  const remove = async () => {
    if (!edit?.item) return;
    const res = await run(adminEndpoints.contentItem(edit.item.id), { method: "DELETE" }, { key: "del", success: t("deleted"), onReload: api.reload });
    if (res.ok) {
      setEdit(null);
      api.reload();
    }
  };
  const onImport = async (f: File | undefined) => {
    if (!f) return;
    const fd = new FormData();
    fd.append("file", f);
    const res = await upload<ThoughtsImportResult>(adminEndpoints.thoughtsImport(), fd, "import");
    if (file.current) file.current.value = "";
    if (res.ok) {
      setResult(res.data);
      api.reload();
    } else if (res.status === 422) setResult({ created: 0, updated: 0, errors: [{ row: 1, message: { en: res.error.message, hi: null } }] });
  };

  return (
    <div className={styles.page}>
      <PageHead
        title={t("thoughtsTitle")}
        sub={t("thoughtsSub")}
        actions={
          <>
            <Button variant="ghost" href="/admin/content">
              {t("back")}
            </Button>
            <input ref={file} type="file" accept=".csv,text/csv" hidden tabIndex={-1} onChange={(e) => onImport(e.target.files?.[0])} />
            <Button variant="secondary" icon="upload" pending={importing === "import"} onClick={() => file.current?.click()}>
              {t("importCsv")}
            </Button>
          </>
        }
      />
      <div className={c.bar}>
        <Link href={{ pathname: "/admin/content/thoughts", query: { from: addDays(from, -DAYS) } }} className={styles.linkBtn}>
          {t("prevDays")}
        </Link>
        <strong>
          {formatIsoDate(from, locale)} – {formatIsoDate(to, locale)}
        </strong>
        <Link href={{ pathname: "/admin/content/thoughts", query: { from: addDays(from, DAYS) } }} className={styles.linkBtn}>
          {t("nextDays")}
        </Link>
        {from !== today ? (
          <Link href="/admin/content/thoughts" className={styles.linkBtn}>
            {t("today")}
          </Link>
        ) : null}
      </div>
      {result ? (
        <Alert tone={result.errors.length ? "attention" : "success"}>
          {t("importResult", { created: result.created, updated: result.updated, errors: result.errors.length })}
          {result.errors.length ? (
            <ul>
              {result.errors.slice(0, 5).map((e) => (
                <li key={e.row}>
                  {t("importRow", { row: e.row })}: {tx(e.message, locale)}
                </li>
              ))}
            </ul>
          ) : null}
        </Alert>
      ) : null}
      <Loadable api={api} rows={4}>
        {(days) => (
          <ul className={c.grid}>
            {days.map((d) => {
              const empty = !d.item;
              return (
                <li key={d.date}>
                  <button type="button" className={cx(c.day, empty && c.dayEmpty, d.date === today && c.dayToday)} style={{ width: "100%" }} onClick={() => open(d)}>
                    <span className={c.dayDate}>{formatIsoDate(d.date, locale)}</span>
                    {d.item ? (
                      <span className={c.dayText}>{tx(d.item.body ?? { en: "", hi: null }, locale)}</span>
                    ) : (
                      <>
                        <span className={styles.cap}>{t("dayEmpty")}</span>
                        {d.shown ? <span className={c.dayText} style={{ opacity: 0.6 }}>{t("dayRepeats", { text: tx(d.shown.text, locale) })}</span> : null}
                        <span className={styles.linkBtn}>{t("dayAdd")}</span>
                      </>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Loadable>
      <Note icon="info">{t("csvNote")}</Note>
      <Dialog
        open={edit !== null}
        onClose={() => setEdit(null)}
        title={edit ? t("dayTitle", { date: formatIsoDate(edit.date, locale) }) : ""}
        width={560}
        footer={
          <div className={styles.dialogFoot}>
            {edit?.item ? (
              <Button variant="ghost" pending={pending === "del"} onClick={remove}>
                {t("removeDay")}
              </Button>
            ) : null}
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
          {err ? <Alert tone="error">{err}</Alert> : null}
          <I18nFields label={t("fThought")} value={text} onChange={setText} multiline rows={4} maxLength={600} />
          <I18nFields label={t("fSource")} value={source} onChange={setSource} requiredEn={false} maxLength={200} />
        </div>
      </Dialog>
    </div>
  );
}
