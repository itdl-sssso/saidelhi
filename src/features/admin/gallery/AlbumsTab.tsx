"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { type AdminGalleryAlbum, adminEndpoints } from "@/contract";
import { Link, useRouter } from "@/i18n/navigation";
import { type AppLocale, formatIsoDate, tx } from "@/lib/format";
import { Button } from "@/ui/Button";
import { Dialog } from "@/ui/Dialog";
import { EmptyState } from "@/ui/EmptyState";
import { Icon } from "@/ui/Icon";
import { Input } from "@/ui/Input";
import { Pagination } from "@/ui/Pagination";
import { Select } from "@/ui/Select";
import { I18nFields, type I18nValue, emptyI18n } from "../fields";
import { Pill } from "../kit";
import { Loadable } from "../parts";
import { hrefWith } from "../url";
import { useAction } from "../useAction";
import { useApi } from "../useApi";
import styles from "../Admin.module.css";
import g from "./Gallery.module.css";

const PAGE_SIZE = 24;

export function AlbumsTab({ canReview, canUpload }: { canReview: boolean; canUpload: boolean }) {
  const t = useTranslations("admin.gallery");
  const locale = useLocale() as AppLocale;
  const sp = useSearchParams();
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const params = Object.fromEntries(sp.entries());
  const [creating, setCreating] = useState(false);
  const api = useApi<AdminGalleryAlbum[], { total: number; page: number; pageSize: number }>(adminEndpoints.galleryAlbums({ page, pageSize: PAGE_SIZE }));

  return (
    <>
      {canUpload || canReview ? (
        <div>
          <Button icon="plus" onClick={() => setCreating(true)}>
            {t("newAlbum")}
          </Button>
        </div>
      ) : null}
      <Loadable api={api} rows={5}>
        {(rows, meta) =>
          rows.length === 0 ? (
            <div className={styles.card}>
              <div className={styles.cardBd}>
                <EmptyState icon="image" title={t("noAlbums")} body={t("noAlbumsBody")} />
              </div>
            </div>
          ) : (
            <div className={styles.card}>
              <ul className={styles.cardBd} style={{ listStyle: "none", margin: 0, gap: 0, padding: "4px 16px" }}>
                {rows.map((a) => (
                  <li key={a.id} className={g.albumRow}>
                    <Link href={`/admin/gallery/albums/${a.id}`} className={g.albumCover} aria-hidden="true" tabIndex={-1}>
                      {a.coverUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={a.coverUrl} alt="" loading="lazy" />
                      ) : (
                        <Icon name="image" size={24} />
                      )}
                    </Link>
                    <div className={styles.col} style={{ gap: 4 }}>
                      <Link href={`/admin/gallery/albums/${a.id}`} className={styles.tblT}>
                        {tx(a.title, locale)}
                      </Link>
                      <span className={styles.cap}>
                        {formatIsoDate(a.date, locale)}
                        {a.event ? ` · ${tx(a.event.title, locale)}` : ""}
                      </span>
                      <span className={g.chips}>
                        <Pill tone={a.status === "published" ? "green" : "slate"}>{t(`status_${a.status}`)}</Pill>
                        <span className={styles.cap}>{t("countsLine", { approved: a.counts.approved, pending: a.counts.pending, rejected: a.counts.rejected })}</span>
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
              {meta && meta.total > PAGE_SIZE ? (
                <div className={styles.pagerWrap}>
                  <Pagination page={page} pageSize={PAGE_SIZE} total={meta.total} href={(n) => hrefWith("/admin/gallery", params, { page: n })} />
                </div>
              ) : null}
            </div>
          )
        }
      </Loadable>
      <NewAlbumDialog open={creating} onClose={() => setCreating(false)} />
    </>
  );
}

function NewAlbumDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslations("admin.gallery");
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const { run, pending } = useAction();
  const events = useApi<Array<{ id: string; title: { en: string; hi: string | null }; startsAt: string }>>(open ? adminEndpoints.events({ status: "approved", pageSize: 50 }) : null);
  const [title, setTitle] = useState<I18nValue>(emptyI18n());
  const [date, setDate] = useState("");
  const [eventId, setEventId] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = async () => {
    if (!eventId && !title.en.trim()) return setErrors({ title: t("titleRequired") });
    const body = { ...(title.en.trim() ? { title: { en: title.en.trim(), hi: title.hi?.trim() || null } } : {}), ...(date ? { date } : {}), eventId: eventId || null };
    const res = await run<AdminGalleryAlbum>(adminEndpoints.galleryAlbums(), { body }, { key: "create", refresh: false, quiet422: true });
    if (!res.ok) return setErrors(res.error.fields ?? { title: res.error.message });
    onClose();
    router.push(`/admin/gallery/albums/${res.data.id}`);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      width={560}
      title={t("newAlbum")}
      footer={
        <div className={styles.dialogFoot}>
          <Button variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button pending={pending === "create"} onClick={submit}>
            {t("createAlbum")}
          </Button>
        </div>
      }
    >
      <div className={styles.dialogBody}>
        <Select
          label={t("fromEvent")}
          optional
          hint={t("fromEventHint")}
          value={eventId}
          onChange={(e) => setEventId(e.target.value)}
          placeholder={t("noEvent")}
          options={events.status === "ready" ? events.data.map((e) => ({ value: e.id, label: tx(e.title, locale) })) : []}
        />
        <I18nFields label={t("albumTitle")} value={title} onChange={(v) => (setTitle(v), setErrors({}))} error={errors.title ?? errors["title.en"]} requiredEn={!eventId} maxLength={160} />
        <Input label={t("albumDate")} type="date" optional value={date} onChange={(e) => setDate(e.target.value)} error={errors.date} />
      </div>
    </Dialog>
  );
}
