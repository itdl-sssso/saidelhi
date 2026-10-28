"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { type AdminGalleryPhoto, adminEndpoints } from "@/contract";
import { Link } from "@/i18n/navigation";
import { type AppLocale, tx } from "@/lib/format";
import { Button } from "@/ui/Button";
import { Checkbox } from "@/ui/Checkbox";
import { EmptyState } from "@/ui/EmptyState";
import { Pagination } from "@/ui/Pagination";
import { useToast } from "@/ui/Toast";
import { ReasonDialog } from "../Dialogs";
import { PageHead, Pill } from "../kit";
import { LinkTabs, Loadable } from "../parts";
import { fmtShortDateTime } from "../time";
import { hrefWith } from "../url";
import { useAction } from "../useAction";
import { useApi } from "../useApi";
import { ApproveDialog } from "./ApproveDialog";
import { AlbumsTab } from "./AlbumsTab";
import { GALLERY_TABS, type GalleryTab, type PhotoCounts, previewSrc } from "./shared";
import styles from "../Admin.module.css";
import g from "./Gallery.module.css";

const PAGE_SIZE = 24;

export function GalleryPage({ canReview, canUpload }: { canReview: boolean; canUpload: boolean }) {
  const t = useTranslations("admin.gallery");
  const sp = useSearchParams();
  const raw = sp.get("tab");
  const tab: GalleryTab = (GALLERY_TABS as readonly string[]).includes(raw ?? "") ? (raw as GalleryTab) : "pending";
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const params = Object.fromEntries(sp.entries());
  const isPhotos = tab !== "albums";
  // On the Albums tab the photos call only feeds the tab counts.
  const api = useApi<AdminGalleryPhoto[], { total: number; page: number; pageSize: number; counts: PhotoCounts }>(
    adminEndpoints.galleryPhotos({ status: isPhotos ? tab : "pending", page: isPhotos ? page : 1, pageSize: isPhotos ? PAGE_SIZE : 1 }),
  );
  const counts = api.status === "ready" ? api.meta?.counts : undefined;
  const labels = { pending: t("tabPending"), approved: t("tabApproved"), rejected: t("tabRejected"), albums: t("tabAlbums") } as const;

  return (
    <div className={styles.page}>
      <PageHead title={t("title")} sub={canReview ? t("sub") : t("subUploader")} />
      <LinkTabs path="/admin/gallery" tabs={GALLERY_TABS} current={tab} label={t("tabsLabel")} labels={labels} counts={counts ? { pending: counts.pending, approved: counts.approved, rejected: counts.rejected } : undefined} />
      {isPhotos ? (
        <Loadable api={api} rows={6}>
          {(rows, meta) => <PhotoGrid rows={rows} total={meta?.total ?? rows.length} tab={tab} page={page} params={params} canReview={canReview} reload={api.reload} />}
        </Loadable>
      ) : (
        <AlbumsTab canReview={canReview} canUpload={canUpload} />
      )}
    </div>
  );
}

function PhotoGrid({ rows, total, tab, page, params, canReview, reload }: { rows: AdminGalleryPhoto[]; total: number; tab: GalleryTab; page: number; params: Record<string, string>; canReview: boolean; reload: () => void }) {
  const t = useTranslations("admin.gallery");
  const locale = useLocale() as AppLocale;
  const toast = useToast();
  const { run, pending } = useAction();
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [approving, setApproving] = useState<AdminGalleryPhoto[]>([]);
  const [rejecting, setRejecting] = useState<AdminGalleryPhoto[]>([]);

  // Ids no longer on the page simply drop out of `selected`.
  const selected = rows.filter((r) => picked.has(r.id));
  const reviewable = canReview && tab === "pending";
  const toggle = (id: string) =>
    setPicked((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const reject = async (reason: string) => {
    if (rejecting.length === 1) {
      const p = rejecting[0];
      const res = await run(adminEndpoints.galleryPhotoAction(p.id, "reject"), { body: { version: p.version, reason } }, { key: "reject", refresh: false, success: t("rejected"), onReload: reload });
      if (res.ok) reload();
      return res.ok;
    }
    const res = await run<{ done: string[]; failed: { id: string; code: string }[] }>(adminEndpoints.galleryPhotosBulk(), { body: { action: "reject", ids: rejecting.map((p) => p.id), reason } }, { key: "reject", refresh: false, onReload: reload });
    if (!res.ok) return false;
    toast.show({ tone: res.data.failed.length ? "error" : "success", message: t("bulkResult", { done: res.data.done.length, failed: res.data.failed.length }) });
    reload();
    return true;
  };

  if (rows.length === 0)
    return (
      <div className={styles.card}>
        <div className={styles.cardBd}>
          <EmptyState icon="image" title={t(`empty_${tab as "pending" | "approved" | "rejected"}`)} body={tab === "pending" ? t("emptyPendingBody") : undefined} />
        </div>
      </div>
    );

  return (
    <>
      {reviewable ? (
        <div className={g.toolbar}>
          <Checkbox label={t("selectAll")} checked={selected.length === rows.length} onChange={(e) => setPicked(e.target.checked ? new Set(rows.map((r) => r.id)) : new Set())} />
          {selected.length ? (
            <div className={g.toolbarSel} role="group" aria-label={t("bulkLabel")}>
              <span className={styles.strong} aria-live="polite">
                {t("selectedN", { count: selected.length })}
              </span>
              <Button size="sm" icon="check" onClick={() => setApproving(selected)}>
                {t("approveSelected")}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setRejecting(selected)}>
                {t("rejectSelected")}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
      <ul className={g.grid}>
        {rows.map((p) => (
          <li key={p.id} className={`${g.pcard} ${picked.has(p.id) ? g.pcardSel : ""}`}>
            <Link href={`/admin/gallery/photos/${p.id}`} className={g.thumb} aria-label={t("openEditor")}>
              {/* Authenticated, metadata-stripped preview; next/image would re-fetch without the session. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewSrc(p)} alt={tx(p.alt, locale) || t("photoAlt")} loading="lazy" />
            </Link>
            {reviewable ? (
              <span className={g.pick}>
                <Checkbox label={<span className={styles.srOnly}>{t("selectPhoto")}</span>} checked={picked.has(p.id)} onChange={() => toggle(p.id)} />
              </span>
            ) : null}
            <span className={g.badges}>
              {p.revision > 0 ? <Pill tone="blue">{t("edited")}</Pill> : null}
              {p.isCover ? <Pill tone="yellow">{t("cover")}</Pill> : null}
            </span>
            <div className={g.pbody}>
              <span className={g.pttl}>{p.album ? tx(p.album.title, locale) : p.event ? tx(p.event.title, locale) : t("noAlbum")}</span>
              <span className={g.pmeta}>
                {t("from", { from: p.from })} · {fmtShortDateTime(p.receivedAt, locale)}
              </span>
              {p.album && p.event ? <span className={g.pmeta}>{t("event", { title: tx(p.event.title, locale) })}</span> : null}
              {tab === "rejected" && p.rejectReason ? <span className={g.reason}>{t("rejectedFor", { reason: p.rejectReason })}</span> : null}
              {tab !== "pending" && p.reviewedBy ? <span className={g.pmeta}>{t("reviewedBy", { by: p.reviewedBy })}</span> : null}
            </div>
            <div className={g.pact}>
              {p.can.review && p.status === "pending" ? (
                <>
                  <Button size="sm" icon="check" onClick={() => setApproving([p])} pending={pending === `a${p.id}`}>
                    {t("approve")}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setRejecting([p])}>
                    {t("reject")}
                  </Button>
                </>
              ) : null}
              <Button size="sm" variant="ghost" href={`/admin/gallery/photos/${p.id}`}>
                {p.can.edit ? t("edit") : t("view")}
              </Button>
            </div>
          </li>
        ))}
      </ul>
      {total > PAGE_SIZE ? (
        <div className={styles.pagerWrap}>
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} href={(n) => hrefWith("/admin/gallery", params, { page: n })} />
        </div>
      ) : null}
      <ApproveDialog photos={approving} onClose={() => setApproving([])} onDone={reload} />
      <ReasonDialog
        open={rejecting.length > 0}
        onClose={() => setRejecting([])}
        title={t("rejectTitle", { count: rejecting.length })}
        body={<p>{t("rejectBody")}</p>}
        label={t("rejectReason")}
        confirmLabel={t("reject")}
        required
        pending={pending === "reject"}
        onSubmit={reject}
      />
    </>
  );
}
