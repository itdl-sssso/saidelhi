"use client";

import { useCallback, useMemo, useRef, useState, type MutableRefObject } from "react";
import { useTranslations } from "next-intl";
import type { AnswerMap, LinkAttachment } from "@/contract";
import type { UploadItem } from "@/ui/FileUpload";
import { formatBytes } from "@/ui/FileUpload";
import { ATTACHMENT_LIMITS } from "@/contract";
import type { AppLocale } from "@/lib/format";
import type { LinkApi } from "../api";
import { shrinkPhoto } from "../photo";
import { LOCAL_FILE_PREFIX, isLocalFileId } from "../model";
import { type Draft, type FormStore, type StoredFile, newKey } from "../store";
import type { FileHandlers } from "./FieldRenderer";

interface Pending {
  key: string;
  name: string;
  size: number;
  mime: string;
  progress: number;
  error?: string;
}

/**
 * Photos and files of a form: upload when online, otherwise keep the photo on the phone
 * (`local-…` id, bytes in IndexedDB) so the send queue uploads it later.
 */
export function useUploads(args: {
  api: LinkApi;
  store: FormStore | null;
  linkKey: string | null;
  online: boolean;
  locale: AppLocale;
  answersRef: MutableRefObject<AnswerMap>;
  draftRef: MutableRefObject<Draft | null>;
  commit: (next: AnswerMap, patch?: Partial<Draft>) => void;
}) {
  const { api, store, linkKey, online, answersRef, draftRef, commit } = args;
  const t = useTranslations("formlink");
  const [pending, setPending] = useState<Record<string, Pending[]>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [, bump] = useState(0);
  const blobs = useRef(new Map<string, File>());

  const setNote = (fieldId: string, text: string | null) =>
    setNotes((n) => {
      const rest = { ...n };
      delete rest[fieldId];
      return text ? { ...rest, [fieldId]: text } : rest;
    });

  const patchPending = (fieldId: string, key: string, patch: Partial<Pending> | null) =>
    setPending((p) => {
      const list = (p[fieldId] ?? []).filter((x) => x.key !== key || patch !== null);
      return { ...p, [fieldId]: patch === null ? list : list.map((x) => (x.key === key ? { ...x, ...patch } : x)) };
    });

  const attach = useCallback(
    (fieldId: string, meta: StoredFile) => {
      const cur = answersRef.current[fieldId];
      const ids = Array.isArray(cur) ? (cur as string[]) : [];
      const files = { ...(draftRef.current?.files ?? {}), [fieldId]: [...(draftRef.current?.files[fieldId] ?? []), meta] };
      commit({ ...answersRef.current, [fieldId]: [...ids, meta.id] }, { files });
    },
    [answersRef, draftRef, commit],
  );

  const upload = useCallback(
    async (fieldId: string, file: File, key: string, idem: string) => {
      const keepLocal = async () => {
        if (!store || !linkKey) return patchPending(fieldId, key, { error: t("genericError") });
        const id = `${LOCAL_FILE_PREFIX}${newKey()}`;
        await store.putFile({ key: id, linkKey, fieldId, name: file.name, mime: file.type, size: file.size, blob: file, idempotencyKey: idem });
        patchPending(fieldId, key, null);
        blobs.current.delete(key);
        attach(fieldId, { id, name: file.name, size: file.size, mime: file.type });
      };
      if (!online) return keepLocal();
      const r = await api.upload(file, file.name, fieldId, idem, (pct) => patchPending(fieldId, key, { progress: pct }));
      if (r.ok) {
        patchPending(fieldId, key, null);
        blobs.current.delete(key);
        attach(fieldId, { id: r.data.id, name: r.data.name, size: r.data.size, mime: r.data.mime });
        return;
      }
      if (r.status === 0 || r.status >= 500 || r.status === 429 || r.status === 503) return keepLocal();
      if (r.status === 401) return keepLocal();
      patchPending(fieldId, key, { error: r.error.fields?.file ?? r.error.message });
    },
    [api, attach, linkKey, online, store, t],
  );

  const handlers: FileHandlers = useMemo(
    () => ({
      items: (fieldId) => {
        const cur = answersRef.current[fieldId];
        const ids = Array.isArray(cur) ? (cur as string[]) : [];
        const meta = draftRef.current?.files[fieldId] ?? [];
        const done: UploadItem[] = ids.map((id) => {
          const m = meta.find((x) => x.id === id);
          return { key: id, name: m?.name ?? "photo", size: m?.size ?? 0, mime: m?.mime ?? "image/jpeg", status: isLocalFileId(id) ? "queued" : "done" };
        });
        const up: UploadItem[] = (pending[fieldId] ?? []).map((p) => ({
          key: p.key,
          name: p.name,
          size: p.size,
          mime: p.mime,
          status: p.error ? "error" : "uploading",
          progress: p.progress,
          error: p.error,
        }));
        return [...done, ...up];
      },
      add: (fieldId, files, max, photos) => {
        setNote(fieldId, null);
        const have = (Array.isArray(answersRef.current[fieldId]) ? (answersRef.current[fieldId] as unknown[]).length : 0) + (pending[fieldId]?.length ?? 0);
        const room = max === null ? files.length : Math.max(0, max - have);
        for (const file of files.slice(0, room)) {
          const key = `up-${newKey()}`;
          blobs.current.set(key, file);
          setPending((p) => ({ ...p, [fieldId]: [...(p[fieldId] ?? []), { key, name: file.name, size: file.size, mime: file.type, progress: 0 }] }));
          void (photos ? shrinkPhoto(file) : Promise.resolve(file)).then((f) => {
            blobs.current.set(key, f);
            patchPending(fieldId, key, { name: f.name, size: f.size, mime: f.type });
            return upload(fieldId, f, key, newKey());
          });
        }
      },
      reject: (fieldId, _file, problem) =>
        setNote(fieldId, problem === "type" ? t("fileType") : problem === "size" ? t("fileSize", { size: formatBytes(ATTACHMENT_LIMITS.maxBytes) }) : t("fileEmpty")),
      remove: (fieldId, key) => {
        if (key.startsWith("up-")) {
          blobs.current.delete(key);
          return patchPending(fieldId, key, null);
        }
        const cur = answersRef.current[fieldId];
        const ids = Array.isArray(cur) ? (cur as string[]) : [];
        const files = { ...(draftRef.current?.files ?? {}), [fieldId]: (draftRef.current?.files[fieldId] ?? []).filter((m) => m.id !== key) };
        if (isLocalFileId(key)) void store?.deleteFile(key);
        commit({ ...answersRef.current, [fieldId]: ids.filter((x) => x !== key) }, { files });
        bump((n) => n + 1);
      },
      retry: (fieldId, key) => {
        const file = blobs.current.get(key);
        if (!file) return patchPending(fieldId, key, null);
        patchPending(fieldId, key, { error: undefined, progress: 0 });
        void upload(fieldId, file, key, newKey());
      },
    }),
    // answersRef/draftRef are refs read at call time; `pending` drives re-render of items.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pending, upload, store, commit, t],
  );

  /** A photo taken offline reached the server: swap its local id everywhere in the draft. */
  const onOfflineFileUploaded = useCallback(
    (localKey: string, att: LinkAttachment) => {
      const answers: AnswerMap = { ...answersRef.current };
      for (const [k, v] of Object.entries(answers)) {
        if (Array.isArray(v) && v.includes(localKey)) answers[k] = v.map((x) => (x === localKey ? att.id : x));
      }
      const files: Draft["files"] = {};
      for (const [k, list] of Object.entries(draftRef.current?.files ?? {})) {
        files[k] = list.map((m) => (m.id === localKey ? { id: att.id, name: att.name, size: att.size, mime: att.mime } : m));
      }
      commit(answers, { files });
    },
    [answersRef, draftRef, commit],
  );

  return { handlers, notes, onOfflineFileUploaded };
}
