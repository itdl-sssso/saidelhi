"use client";

import { useRef, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "../Icon";
import { FormField, fieldIds, type FieldNote } from "../FormField/FormField";
import { cx } from "../cx";
import styles from "./FileUpload.module.css";
import { checkFile, formatBytes, mimeLabels, type FileLimits, type FileProblem } from "./rules";

export type UploadItem = {
  /** Local key (stable while uploading); the server id once uploaded. */
  key: string;
  name: string;
  size: number;
  mime: string;
  status: "uploading" | "done" | "queued" | "error";
  /** 0–100 while uploading. */
  progress?: number;
  error?: ReactNode;
};

export type FileUploadProps = {
  id: string;
  label: ReactNode;
  items: UploadItem[];
  limits: FileLimits;
  /** Called with files that passed the type/size check. */
  onAdd: (files: File[]) => void;
  /** Called for files that failed the check. */
  onReject?: (file: File, problem: FileProblem) => void;
  onRemove: (key: string) => void;
  onRetry?: (key: string) => void;
  help?: ReactNode;
  optional?: boolean;
  badge?: ReactNode;
  messages?: FieldNote[];
  maxFiles?: number | null;
  disabled?: boolean;
  /** Marks uploads as private ("never published") under each file name. */
  privateNote?: boolean;
};

/** Photo/file picker: "Take a photo" opens the camera on phones, "Choose a file" the gallery/files. */
export function FileUpload({
  id,
  label,
  items,
  limits,
  onAdd,
  onReject,
  onRemove,
  onRetry,
  help,
  optional,
  badge,
  messages,
  maxFiles,
  disabled,
  privateNote = true,
}: FileUploadProps) {
  const t = useTranslations("fieldKit");
  const camera = useRef<HTMLInputElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const full = maxFiles != null && items.length >= maxFiles;
  const types = mimeLabels(limits.mimes);
  const accept = limits.mimes.join(",");
  const hasImages = limits.mimes.some((m) => m.startsWith("image/"));

  const take = (list: FileList | null) => {
    if (!list) return;
    const room = maxFiles == null ? Infinity : Math.max(0, maxFiles - items.length);
    const ok: File[] = [];
    for (const f of Array.from(list)) {
      const problem = checkFile(f, limits);
      if (problem) onReject?.(f, problem);
      else if (ok.length < room) ok.push(f);
    }
    if (ok.length) onAdd(ok);
  };

  return (
    <FormField id={id} label={label} help={help} optional={optional} badge={badge} messages={messages} kind="group">
      <div id={id} role="group" aria-labelledby={fieldIds(id).label} className={styles.wrap}>
        {items.length ? (
          <ul className={styles.files}>
            {items.map((it) => (
              <li key={it.key} className={cx(styles.file, it.status === "error" && styles.fileError)}>
                <span className={styles.thumb}>
                  <Icon name={it.mime === "application/pdf" ? "file-text" : "image"} size={20} />
                </span>
                <div className={styles.meta}>
                  <span className={styles.name}>{it.name}</span>
                  {it.status === "uploading" ? (
                    <span className={styles.progress}>
                      <span
                        className={styles.bar}
                        role="progressbar"
                        aria-label={t("uploadingFile", { name: it.name })}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={it.progress ?? 0}
                      >
                        <i style={{ width: `${it.progress ?? 0}%` }} />
                      </span>
                      <span className={styles.cap}>{t("uploading", { pct: it.progress ?? 0 })}</span>
                    </span>
                  ) : it.status === "queued" ? (
                    <span className={styles.cap}>
                      <Icon name="cloud-off" size={16} />
                      {t("uploadQueued")}
                    </span>
                  ) : it.status === "error" ? (
                    <span className={cx(styles.cap, styles.capError)}>
                      <Icon name="circle-x" size={16} />
                      {it.error ?? t("uploadFailed")}
                    </span>
                  ) : (
                    <span className={styles.cap}>
                      {privateNote ? <Icon name="lock" size={16} /> : null}
                      {privateNote ? t("privateFile") : null} · {formatBytes(it.size)}
                    </span>
                  )}
                </div>
                {it.status === "error" && onRetry ? (
                  <button type="button" className={styles.icbtn} onClick={() => onRetry(it.key)} aria-label={t("retryFile", { name: it.name })}>
                    <Icon name="refresh-cw" size={18} />
                  </button>
                ) : null}
                <button type="button" className={styles.icbtn} onClick={() => onRemove(it.key)} disabled={disabled} aria-label={t("removeFile", { name: it.name })}>
                  <Icon name="x" size={18} />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {!full ? (
          <div className={styles.drop}>
            <span className={styles.dropIcon}>
              <Icon name="camera" size={24} />
            </span>
            <span className={styles.dropTitle}>{t(hasImages ? "pickTitle" : "pickFileTitle")}</span>
            <span className={styles.cap}>{t("pickHint", { types: types.join(", "), size: formatBytes(limits.maxBytes) })}</span>
            <div className={styles.dropActions}>
              {hasImages ? (
                <button type="button" className={styles.pick} onClick={() => camera.current?.click()} disabled={disabled}>
                  <Icon name="camera" size={18} />
                  {t("takePhoto")}
                </button>
              ) : null}
              <button type="button" className={styles.pick} onClick={() => picker.current?.click()} disabled={disabled}>
                <Icon name="paperclip" size={18} />
                {t("chooseFile")}
              </button>
            </div>
            <input
              ref={camera}
              type="file"
              accept={limits.mimes.filter((m) => m.startsWith("image/")).join(",")}
              capture="environment"
              hidden
              tabIndex={-1}
              onChange={(e) => {
                take(e.target.files);
                e.target.value = "";
              }}
            />
            <input
              ref={picker}
              type="file"
              accept={accept}
              multiple={maxFiles == null || maxFiles - items.length > 1}
              hidden
              tabIndex={-1}
              onChange={(e) => {
                take(e.target.files);
                e.target.value = "";
              }}
            />
          </div>
        ) : null}
      </div>
    </FormField>
  );
}
