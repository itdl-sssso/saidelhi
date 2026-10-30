"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { type AdminGalleryAlbumDetail, type AdminGalleryPhoto, GALLERY_LIMITS, adminEndpoints } from "@/contract";
import { Link } from "@/i18n/navigation";
import { type AppLocale, tx } from "@/lib/format";
import { Button } from "@/ui/Button";
import { Icon } from "@/ui/Icon";
import { Input } from "@/ui/Input";
import { I18nFields, type I18nValue, toI18n } from "../fields";
import { ArrowDown, ArrowUp } from "../icons";
import { PageHead, Panel, Pill, type Tone } from "../kit";
import { Loadable } from "../parts";
import { useAction } from "../useAction";
import { useApi } from "../useApi";
import { useUpload } from "../useUpload";
import { previewSrc } from "./shared";
import styles from "../Admin.module.css";
import g from "./Gallery.module.css";

const STATUS_TONE: Record<AdminGalleryPhoto["status"], Tone> = { pending: "yellow", approved: "green", rejected: "slate" };

export function AlbumEditor({ id, canReview, canUpload }: { id: string; canReview: boolean; canUpload: boolean }) {
  const api = useApi<AdminGalleryAlbumDetail>(adminEndpoints.galleryAlbum(id));
  return <Loadable api={api}>{(album) => <Editor key={`${album.id}.${album.version}`} album={album} reload={api.reload} canReview={canReview} canUpload={canUpload} />}</Loadable>;
}

function Editor({ album, reload, canReview, canUpload }: { album: AdminGalleryAlbumDetail; reload: () => void; canReview: boolean; canUpload: boolean }) {
  const t = useTranslations("admin.gallery");
  const locale = useLocale() as AppLocale;
  const { run, pending } = useAction();
  const [title, setTitle] = useState<I18nValue>(toI18n(album.title));
  const [description, setDescription] = useState<I18nValue>(toI18n(album.description));
  const [date, setDate] = useState(album.date);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const dirty = title.en !== album.title.en || (title.hi ?? "") !== (album.title.hi ?? "") || description.en !== album.description.en || (description.hi ?? "") !== (album.description.hi ?? "") || date !== album.date;
  const patch = async (key: string, body: Record<string, unknown>, success?: string) => {
    const res = await run<unknown>(adminEndpoints.galleryAlbum(album.id), { method: "PATCH", body: { version: album.version, ...body } }, { key, refresh: false, success, onReload: reload, quiet422: true });
    if (res.ok) reload();
    else if (res.status === 422) setErrors(res.error.fields ?? { form: res.error.message });
    return res.ok;
  };
  const move = (idx: number, d: -1 | 1) => {
    const ids = album.photos.map((p) => p.id);
    const j = idx + d;
    if (j < 0 || j >= ids.length) return;
    [ids[idx], ids[j]] = [ids[j], ids[idx]];
    void patch(`move${idx}`, { photoOrder: ids });
  };

  return (
    <div className={styles.page}>
      <PageHead
        back={{ href: "/admin/gallery?tab=albums", label: t("backToAlbums") }}
        title={tx(album.title, locale)}
        sub={
          <>
            <Pill tone={album.status === "published" ? "green" : "slate"}>{t(`status_${album.status}`)}</Pill>{" "}
            {t("countsLine", { approved: album.counts.approved, pending: album.counts.pending, rejected: album.counts.rejected })}
          </>
        }
        actions={
          <>
            {album.publicUrl && album.status === "published" ? (
              <Button variant="outline" href={album.publicUrl} external icon="external-link">
                {t("viewPublic")}
              </Button>
            ) : null}
            {canReview ? (
              <Button variant={album.status === "published" ? "outline" : "primary"} pending={pending === "publish"} disabled={dirty} onClick={() => patch("publish", { status: album.status === "published" ? "draft" : "published" }, album.status === "published" ? t("unpublished") : t("published"))}>
                {album.status === "published" ? t("unpublish") : t("publish")}
              </Button>
            ) : null}
          </>
        }
      />
      {errors.status ? (
        <p className={styles.callout} role="alert">
          {errors.status}
        </p>
      ) : null}
      <Panel title={t("details")}>
        <div className={styles.stack}>
          <I18nFields label={t("albumTitle")} value={title} onChange={(v) => (setTitle(v), setErrors({}))} error={errors.title ?? errors["title.en"]} maxLength={160} />
          <I18nFields label={t("albumDescription")} value={description} onChange={setDescription} multiline requiredEn={false} rows={3} maxLength={1000} />
          <Input label={t("albumDate")} type="date" value={date} onChange={(e) => setDate(e.target.value)} error={errors.date} style={{ maxWidth: 220 }} />
          {album.event ? (
            <p className={styles.cap}>
              {t("linkedEvent")}: <Link href={`/admin/events/${album.event.id}`}>{tx(album.event.title, locale)}</Link>
            </p>
          ) : null}
          <div>
            <Button
              pending={pending === "save"}
              disabled={!dirty || !title.en.trim()}
              onClick={() =>
                patch("save", { title: { en: title.en.trim(), hi: title.hi?.trim() || null }, description: { en: description.en.trim(), hi: description.hi?.trim() || null }, date }, t("saved"))
              }
            >
              {t("save")}
            </Button>
          </div>
        </div>
      </Panel>
      <Panel title={t("photosHeading", { count: album.photos.length })} action={canUpload ? <UploadButton albumId={album.id} reload={reload} /> : undefined}>
        {album.photos.length === 0 ? (
          <p className={styles.cap}>{t("albumEmpty")}</p>
        ) : (
          <ul className={g.grid}>
            {album.photos.map((p, i) => (
              <li key={p.id} className={g.pcard}>
                <Link href={`/admin/gallery/photos/${p.id}`} className={g.thumb} aria-label={t("openEditor")}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewSrc(p)} alt={tx(p.alt, locale) || t("photoAlt")} loading="lazy" />
                </Link>
                <span className={g.badges}>
                  <Pill tone={STATUS_TONE[p.status]}>{t(`photoStatus_${p.status}`)}</Pill>
                  {p.isCover ? <Pill tone="yellow">{t("cover")}</Pill> : null}
                </span>
                <div className={g.pbody}>
                  <span className={g.pmeta}>{t("positionOf", { n: i + 1, total: album.photos.length })}</span>
                </div>
                <div className={g.pact}>
                  {canReview ? (
                    <>
                      <Button size="sm" variant="outline" aria-label={t("moveEarlier", { n: i + 1 })} disabled={i === 0 || pending !== null} onClick={() => move(i, -1)}>
                        <Icon icon={ArrowUp} size={16} />
                      </Button>
                      <Button size="sm" variant="outline" aria-label={t("moveLater", { n: i + 1 })} disabled={i === album.photos.length - 1 || pending !== null} onClick={() => move(i, 1)}>
                        <Icon icon={ArrowDown} size={16} />
                      </Button>
                      {p.status === "approved" && !p.isCover ? (
                        <Button size="sm" variant="outline" onClick={() => patch(`cover${p.id}`, { coverPhotoId: p.id }, t("coverSet"))}>
                          {t("setCover")}
                        </Button>
                      ) : null}
                    </>
                  ) : null}
                  <Button size="sm" variant="ghost" href={`/admin/gallery/photos/${p.id}`}>
                    {p.can.edit ? t("edit") : t("view")}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

type UploadState = { name: string; state: "queued" | "sending" | "done" | "error"; error?: string };

function UploadButton({ albumId, reload }: { albumId: string; reload: () => void }) {
  const t = useTranslations("admin.gallery");
  const { upload } = useUpload();
  const input = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<UploadState[]>([]);
  const busy = files.some((f) => f.state === "queued" || f.state === "sending");
  // Fresh album data once the batch finishes.
  const done = files.length > 0 && !busy;
  useEffect(() => {
    if (done) reload();
  }, [done, reload]);

  const send = async (list: File[]) => {
    setFiles(list.map((f) => ({ name: f.name, state: "queued" })));
    const set = (i: number, patch: Partial<UploadState>) => setFiles((s) => s.map((x, j) => (j === i ? { ...x, ...patch } : x)));
    for (let i = 0; i < list.length; i++) {
      const f = list[i];
      if (f.size > GALLERY_LIMITS.bytes) {
        set(i, { state: "error", error: t("tooLarge") });
        continue;
      }
      if (!(GALLERY_LIMITS.mimes as readonly string[]).includes(f.type)) {
        set(i, { state: "error", error: t("badType") });
        continue;
      }
      set(i, { state: "sending" });
      const form = new FormData();
      form.append("file", f);
      form.append("albumId", albumId);
      const res = await upload<AdminGalleryPhoto>(adminEndpoints.galleryPhotos(), form, "upload");
      set(i, res.ok ? { state: "done" } : { state: "error", error: res.error.message });
    }
  };

  return (
    <div className={g.drop}>
      <input
        ref={input}
        type="file"
        accept={GALLERY_LIMITS.mimes.join(",")}
        multiple
        hidden
        onChange={(e) => {
          const list = Array.from(e.target.files ?? []);
          e.target.value = "";
          if (list.length) void send(list);
        }}
      />
      <Button variant="outline" icon="upload" pending={busy} onClick={() => input.current?.click()}>
        {t("uploadPhotos")}
      </Button>
      {files.length ? (
        <ul className={g.uploads} aria-live="polite">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`} className={g.uploadRow}>
              <span>{f.name}</span>
              <span className={f.state === "error" ? g.uploadErr : undefined}>{f.state === "error" ? f.error : t(`upload_${f.state}`)}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
