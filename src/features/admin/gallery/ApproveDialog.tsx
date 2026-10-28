"use client";

// Approve one or many photos into an album: pick an album, or (single photo with an event) create one from the event.
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { type AdminGalleryAlbum, type AdminGalleryPhoto, adminEndpoints } from "@/contract";
import { type AppLocale, tx } from "@/lib/format";
import { Button } from "@/ui/Button";
import { Dialog } from "@/ui/Dialog";
import { Select } from "@/ui/Select";
import { useToast } from "@/ui/Toast";
import { useAction } from "../useAction";
import { useApi } from "../useApi";
import styles from "../Admin.module.css";

const FROM_EVENT = "__event__";

export function ApproveDialog({ photos, onClose, onDone }: { photos: AdminGalleryPhoto[]; onClose: () => void; onDone: () => void }) {
  const t = useTranslations("admin.gallery");
  const locale = useLocale() as AppLocale;
  const toast = useToast();
  const { run, pending } = useAction();
  const open = photos.length > 0;
  const albums = useApi<AdminGalleryAlbum[]>(open ? adminEndpoints.galleryAlbums({ pageSize: 60 }) : null);
  const single = photos.length === 1 ? photos[0] : null;
  const allHaveAlbum = photos.every((p) => p.album);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const options = [
    ...(allHaveAlbum ? [{ value: "", label: t("keepAlbum") }] : []),
    ...(single?.event && !single.album ? [{ value: FROM_EVENT, label: t("createFromEvent", { title: tx(single.event.title, locale) }) }] : []),
    ...(albums.status === "ready" ? albums.data.map((a) => ({ value: a.id, label: `${tx(a.title, locale)}${a.status === "draft" ? ` (${t("draft")})` : ""}` })) : []),
  ];
  const preset = single?.event && !single.album ? FROM_EVENT : (single?.album?.id ?? "");
  const current = value || (open ? preset : "");

  const close = () => {
    setValue("");
    setError(null);
    onClose();
  };

  const submit = async () => {
    if (!current && !allHaveAlbum) return setError(t("albumRequired"));
    if (single) {
      let albumId = current === FROM_EVENT ? undefined : current || undefined;
      if (current === FROM_EVENT && single.event) {
        const made = await run<AdminGalleryAlbum>(adminEndpoints.galleryAlbums(), { body: { eventId: single.event.id } }, { key: "approve", refresh: false, quiet422: true });
        if (!made.ok) return setError(made.error.message);
        albumId = made.data.id;
      }
      const res = await run(adminEndpoints.galleryPhotoAction(single.id, "approve"), { body: { version: single.version, albumId } }, { key: "approve", refresh: false, success: t("approved"), onReload: onDone, quiet422: true });
      if (!res.ok) {
        if (res.status === 422) setError(res.error.fields?.albumId ?? res.error.message);
        return;
      }
    } else {
      const res = await run<{ done: string[]; failed: { id: string; code: string }[] }>(adminEndpoints.galleryPhotosBulk(), { body: { action: "approve", ids: photos.map((p) => p.id), albumId: current || undefined } }, { key: "approve", refresh: false, onReload: onDone, quiet422: true });
      if (!res.ok) return setError(res.error.fields?.albumId ?? res.error.message);
      toast.show({ tone: res.data.failed.length ? "error" : "success", message: t("bulkResult", { done: res.data.done.length, failed: res.data.failed.length }) });
    }
    close();
    onDone();
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      title={t("approveTitle", { count: photos.length })}
      footer={
        <div className={styles.dialogFoot}>
          <Button variant="ghost" onClick={close}>
            {t("cancel")}
          </Button>
          <Button pending={pending === "approve"} onClick={submit}>
            {t("approve")}
          </Button>
        </div>
      }
    >
      <div className={styles.dialogBody}>
        <Select label={t("album")} options={options} placeholder={allHaveAlbum ? undefined : t("chooseAlbum")} value={current} error={error ?? undefined} onChange={(e) => (setValue(e.target.value), setError(null))} />
        {albums.status === "error" ? <p className={styles.cap}>{t("albumsFailed")}</p> : null}
        <p className={styles.cap}>{t("approveNote")}</p>
      </div>
    </Dialog>
  );
}
