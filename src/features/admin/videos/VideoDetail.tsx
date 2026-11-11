"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { type AdminVideo, adminEndpoints } from "@/contract";
import type { AppLocale } from "@/lib/format";
import { Button } from "@/ui/Button";
import { Dialog } from "@/ui/Dialog";
import { Input } from "@/ui/Input";
import { Select } from "@/ui/Select";
import { I18nFields, type I18nValue } from "../fields";
import { Pill } from "../kit";
import { useAction } from "../useAction";
import { useUpload } from "../useUpload";
import styles from "../Admin.module.css";
import v from "./Videos.module.css";
import { STATUS_TONE, fmtDuration, fmtSize } from "./VideosPage";

export function VideoDetail({ video, onClose, onChange, onDeleted }: { video: AdminVideo; onClose: () => void; onChange: (v: AdminVideo) => void; onDeleted: (id: string) => void }) {
  const t = useTranslations("admin.videos");
  const locale = useLocale() as AppLocale;
  const { run, pending } = useAction();
  const { upload, pending: uploading } = useUpload();
  const [title, setTitle] = useState<I18nValue>({ en: video.title.en, hi: video.title.hi });
  const [poster, setPoster] = useState(video.posterTimeS === null ? "" : String(video.posterTimeS));
  const [lang, setLang] = useState<"hi" | "en">(locale === "hi" ? "hi" : "en");
  const [capFile, setCapFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmDel, setConfirmDel] = useState(false);

  const save = async () => {
    const e: Record<string, string> = {};
    if (!title.en.trim()) e.title = t("errTitle");
    const secs = poster.trim() === "" ? null : Number(poster);
    if (secs !== null && (!Number.isFinite(secs) || secs < 0)) e.poster = t("errPoster");
    setErrors(e);
    if (Object.keys(e).length) return;
    const res = await run<AdminVideo>(adminEndpoints.video(video.id), { method: "PATCH", body: { version: video.version, title: { en: title.en.trim(), hi: title.hi?.trim() || null }, posterTimeS: secs } }, { key: "save", success: t("saved"), refresh: false, quiet422: true });
    if (res.ok) onChange(res.data);
    else setErrors(res.error.fields ?? {});
  };

  const addCaptions = async () => {
    if (!capFile) return setErrors({ caption: t("errCaption") });
    setErrors({});
    const form = new FormData();
    form.set("file", capFile);
    form.set("lang", lang);
    const res = await upload<AdminVideo>(adminEndpoints.videoCaptions(video.id), form, "captions");
    if (res.ok) {
      onChange(res.data);
      setCapFile(null);
    } else setErrors({ caption: res.error.fields?.file ?? res.error.message });
  };

  const remove = async () => {
    const res = await run<null>(adminEndpoints.video(video.id), { method: "DELETE" }, { key: "delete", success: t("deleted"), refresh: false });
    if (res.ok) onDeleted(video.id);
    else setConfirmDel(false);
  };

  const ready = video.status === "ready";
  return (
    <Dialog
      open
      onClose={onClose}
      width={720}
      title={video.title.en}
      footer={
        confirmDel ? (
          <>
            <span className={styles.cap} style={{ marginRight: "auto" }}>
              {t("confirmDelete")}
            </span>
            <Button variant="secondary" onClick={() => setConfirmDel(false)}>
              {t("cancel")}
            </Button>
            <Button variant="outline" pending={pending === "delete"} onClick={remove}>
              {t("deleteYes")}
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" icon="trash-2" onClick={() => setConfirmDel(true)} style={{ marginRight: "auto" }}>
              {t("delete")}
            </Button>
            <Button variant="secondary" onClick={onClose}>
              {t("close")}
            </Button>
            <Button pending={pending === "save"} onClick={save}>
              {t("save")}
            </Button>
          </>
        )
      }
    >
      <div className={styles.col} style={{ gap: 16 }}>
        <div className={v.preview}>
          {ready && video.iframeUrl ? (
            <iframe src={video.iframeUrl} title={video.title.en} allow="fullscreen; picture-in-picture" allowFullScreen loading="lazy" />
          ) : video.posterUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={video.posterUrl} alt="" />
          ) : (
            <span className={styles.cap}>{t(`status_${video.status}`)}</span>
          )}
        </div>
        <span className={v.chips}>
          <Pill tone={STATUS_TONE[video.status]}>{t(`status_${video.status}`)}</Pill>
          <span className={styles.cap}>{[video.durationS !== null ? fmtDuration(video.durationS) : null, fmtSize(video.sizeBytes), video.createdBy].filter(Boolean).join(" · ")}</span>
        </span>
        {video.provider === "mock" ? <p className={styles.cap}>{t("mockNote")}</p> : null}

        <I18nFields label={t("videoTitle")} value={title} onChange={setTitle} error={errors.title} maxLength={200} />
        <Input label={t("posterTime")} hint={t("posterHint")} inputMode="decimal" value={poster} error={errors.poster} onChange={(e) => setPoster(e.target.value)} />

        <fieldset className={v.captions} disabled={!ready}>
          <legend>{t("captions")}</legend>
          {video.captions.length ? (
            <span className={v.chips}>
              {video.captions.map((c) => (
                <Pill key={c.lang} tone="blue" icon="check">
                  {c.label}
                </Pill>
              ))}
            </span>
          ) : (
            <span className={styles.cap}>{ready ? t("noCaptions") : t("captionsWait")}</span>
          )}
          <div className={v.capRow}>
            <Select
              label={t("captionLang")}
              value={lang}
              onChange={(e) => setLang(e.target.value as "hi" | "en")}
              options={[
                { value: "hi", label: t("langHi") },
                { value: "en", label: t("langEn") },
              ]}
            />
            <Input type="file" label={t("captionFile")} hint={t("captionHint")} accept=".srt,.vtt" error={errors.caption} onChange={(e) => setCapFile(e.target.files?.[0] ?? null)} />
            <Button variant="secondary" pending={uploading === "captions"} onClick={addCaptions}>
              {t("addCaptions")}
            </Button>
          </div>
        </fieldset>
      </div>
    </Dialog>
  );
}
