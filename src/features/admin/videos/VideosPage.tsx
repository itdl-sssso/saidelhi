"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { type AdminVideo, VIDEO_LIMITS, adminEndpoints } from "@/contract";
import { type AppLocale, formatDate, tx } from "@/lib/format";
import { portalRequest } from "@/lib/portal-api";
import { Button } from "@/ui/Button";
import { Dialog } from "@/ui/Dialog";
import { EmptyState } from "@/ui/EmptyState";
import { Input } from "@/ui/Input";
import { ProgressBar } from "@/ui/ProgressBar";
import { I18nFields, type I18nValue, emptyI18n } from "../fields";
import { PageHead, Pill, type Tone } from "../kit";
import { Loadable } from "../parts";
import { useAction } from "../useAction";
import { useApi } from "../useApi";
import styles from "../Admin.module.css";
import v from "./Videos.module.css";
import { VideoDetail } from "./VideoDetail";
import { canResume, useVideoUploads } from "./useVideoUploads";

export const STATUS_TONE: Record<AdminVideo["status"], Tone> = { uploading: "blue", processing: "yellow", ready: "green", error: "error" };

export function fmtDuration(s: number | null): string {
  if (s === null) return "";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}` : `${m}:${String(sec).padStart(2, "0")}`;
}
export function fmtSize(b: number): string {
  return b >= 1024 ** 3 ? `${(b / 1024 ** 3).toFixed(1)} GB` : `${Math.max(1, Math.round(b / 1024 ** 2))} MB`;
}

export function VideosPage() {
  const t = useTranslations("admin.videos");
  const locale = useLocale() as AppLocale;
  const api = useApi<AdminVideo[], { total: number }>(adminEndpoints.videos({ pageSize: 100 }));
  const [rows, setRows] = useState<AdminVideo[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const picker = useRef<HTMLInputElement>(null);
  const resumeId = useRef<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Adopt each fresh server list once (derived state; later edits stay local).
  const [seen, setSeen] = useState<unknown>(null);
  if (api.status === "ready" && seen !== api.data) {
    setSeen(api.data);
    setRows(api.data);
  }

  const replace = useCallback((nv: AdminVideo) => setRows((r) => (r ? r.map((x) => (x.id === nv.id ? nv : x)) : r)), []);
  const refresh = useCallback(
    async (id: string) => {
      const res = await portalRequest<AdminVideo>(adminEndpoints.video(id));
      if (res.ok) replace(res.data);
    },
    [replace],
  );

  const uploads = useVideoUploads((id) => {
    // Bytes are with the provider: it now transcodes. The poll below flips the row to ready.
    setRows((r) => (r ? r.map((x) => (x.id === id ? { ...x, status: "processing" } : x)) : r));
    void refresh(id);
  });

  // Poll rows the provider is still working on.
  const pendingIds = (rows ?? []).filter((x) => x.status === "processing" || (x.status === "uploading" && !uploads.progress[x.id])).map((x) => x.id).join(",");
  useEffect(() => {
    if (!pendingIds) return;
    const h = setInterval(() => pendingIds.split(",").forEach((id) => void refresh(id)), 6000);
    return () => clearInterval(h);
  }, [pendingIds, refresh]);

  const onCreated = (nv: AdminVideo, file: File) => {
    setRows((r) => [nv, ...(r ?? [])]);
    setCreating(false);
    if (nv.uploadUrl) uploads.start(nv.id, file, nv.uploadUrl);
  };

  const onPickResume = (file: File | undefined) => {
    const id = resumeId.current;
    resumeId.current = null;
    if (!file || !id) return;
    const row = rows?.find((x) => x.id === id);
    if (row && file.size !== row.sizeBytes) return setNotice(t("wrongFile"));
    setNotice(null);
    if (!uploads.resume(id, file)) setNotice(t("cannotResume"));
  };

  const open = rows?.find((x) => x.id === openId) ?? null;

  return (
    <>
      <PageHead
        title={t("title")}
        sub={t("sub")}
        actions={
          <Button icon="upload" onClick={() => setCreating(true)}>
            {t("upload")}
          </Button>
        }
      />
      {uploads.active ? <p className={v.warn}>{t("keepOpen")}</p> : null}
      {notice ? (
        <p className={v.warn} role="alert">
          {notice}
        </p>
      ) : null}
      <input ref={picker} type="file" accept="video/*,.mkv,.mov,.mp4,.webm" hidden onChange={(e) => (onPickResume(e.target.files?.[0]), (e.target.value = ""))} />
      <Loadable api={api} rows={5}>
        {() =>
          !rows || rows.length === 0 ? (
            <div className={styles.card}>
              <div className={styles.cardBd}>
                <EmptyState icon="video" title={t("empty")} body={t("emptyBody")} />
              </div>
            </div>
          ) : (
            <div className={styles.card}>
              <ul className={v.list}>
                {rows.map((x) => {
                  const p = uploads.progress[x.id];
                  return (
                    <li key={x.id} className={v.row}>
                      <div className={v.thumb} aria-hidden="true">
                        {x.posterUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={x.posterUrl} alt="" loading="lazy" />
                        ) : null}
                      </div>
                      <div className={v.main}>
                        <button type="button" className={v.titleBtn} onClick={() => setOpenId(x.id)}>
                          {tx(x.title, locale)}
                        </button>
                        <span className={styles.cap}>
                          {[x.durationS !== null ? fmtDuration(x.durationS) : null, fmtSize(x.sizeBytes), formatDate(x.createdAt, locale)].filter(Boolean).join(" · ")}
                        </span>
                        <span className={v.chips}>
                          <Pill tone={STATUS_TONE[x.status]}>{t(`status_${x.status}`)}</Pill>
                          {x.status === "error" && x.errorReason ? <span className={styles.cap}>{x.errorReason}</span> : null}
                        </span>
                        {p && p.phase !== "done" ? (
                          <div className={v.progress}>
                            <ProgressBar value={p.total ? (p.sent / p.total) * 100 : 0} label={t("progress")} caption={t(`phase_${p.phase}`)} trailing={`${fmtSize(p.sent)} / ${fmtSize(p.total)}`} />
                            <span className={v.btns}>
                              {p.phase === "uploading" ? (
                                <Button size="sm" variant="secondary" onClick={() => uploads.pause(x.id)}>
                                  {t("pause")}
                                </Button>
                              ) : p.phase === "paused" ? (
                                <Button size="sm" variant="secondary" icon="play" onClick={() => uploads.unpause(x.id)}>
                                  {t("resume")}
                                </Button>
                              ) : (
                                <Button size="sm" variant="secondary" icon="refresh-cw" onClick={() => uploads.unpause(x.id)}>
                                  {t("retry")}
                                </Button>
                              )}
                            </span>
                          </div>
                        ) : x.status === "uploading" && !p && canResume(x.id) ? (
                          <span className={v.btns}>
                            <Button
                              size="sm"
                              variant="secondary"
                              icon="upload"
                              onClick={() => {
                                resumeId.current = x.id;
                                picker.current?.click();
                              }}
                            >
                              {t("resumeAfterReload")}
                            </Button>
                          </span>
                        ) : null}
                      </div>
                      <Button size="sm" variant="secondary" onClick={() => setOpenId(x.id)}>
                        {t("details")}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )
        }
      </Loadable>
      <UploadDialog open={creating} onClose={() => setCreating(false)} onCreated={onCreated} />
      {open ? (
        <VideoDetail
          video={open}
          onClose={() => setOpenId(null)}
          onChange={replace}
          onDeleted={(id) => {
            uploads.cancel(id);
            setRows((r) => (r ? r.filter((x) => x.id !== id) : r));
            setOpenId(null);
          }}
        />
      ) : null}
    </>
  );
}

function UploadDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (v: AdminVideo, f: File) => void }) {
  const t = useTranslations("admin.videos");
  const { run, pending } = useAction();
  const [title, setTitle] = useState<I18nValue>(emptyI18n());
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = async () => {
    const e: Record<string, string> = {};
    if (!file) e.file = t("errFile");
    else if (file.size > VIDEO_LIMITS.maxBytes) e.file = t("errTooBig");
    if (!title.en.trim()) e.title = t("errTitle");
    setErrors(e);
    if (Object.keys(e).length || !file) return;
    const body = { title: { en: title.en.trim(), hi: title.hi?.trim() || null }, fileName: file.name, sizeBytes: file.size };
    const res = await run<AdminVideo>(adminEndpoints.videos(), { body }, { key: "create", refresh: false, quiet422: true });
    if (!res.ok) return setErrors(res.error.fields ?? { title: res.error.message });
    onCreated(res.data, file);
    setTitle(emptyI18n());
    setFile(null);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      width={560}
      title={t("uploadTitle")}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button pending={pending === "create"} onClick={submit}>
            {t("startUpload")}
          </Button>
        </>
      }
    >
      <div className={styles.col} style={{ gap: 16 }}>
        <Input
          type="file"
          label={t("file")}
          hint={t("fileHint")}
          accept="video/*,.mkv,.mov,.mp4,.webm"
          error={errors.file}
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            setFile(f);
            if (f && !title.en) setTitle({ ...title, en: f.name.replace(/\.[^.]+$/, "") });
          }}
        />
        <I18nFields label={t("videoTitle")} value={title} onChange={setTitle} error={errors.title} maxLength={200} />
      </div>
    </Dialog>
  );
}
