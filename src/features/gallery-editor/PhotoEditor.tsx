"use client";

// Non-destructive photo editor (spec 52). The browser previews the recipe on a canvas; the server renders the
// real derived file from the original on Save. Crop works with pointer (mouse/touch) and keyboard.
import { useLocale, useTranslations } from "next-intl";
import { type KeyboardEvent, type PointerEvent as RPointerEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CROP_ASPECTS, type AdminGalleryPhoto, type CropAspect, type PhotoEdits, adminEndpoints } from "@/contract";
import { type AppLocale, tx } from "@/lib/format";
import { Button } from "@/ui/Button";
import { Checkbox } from "@/ui/Checkbox";
import { Icon } from "@/ui/Icon";
import { ConfirmDialog } from "../admin/Dialogs";
import { I18nFields, type I18nValue, toI18n } from "../admin/fields";
import { FlipHorizontal2, FlipVertical2, RotateCcw, RotateCw, Undo2 } from "../admin/icons";
import { PageHead, Pill } from "../admin/kit";
import { Loadable } from "../admin/parts";
import { useAction } from "../admin/useAction";
import { useApi } from "../admin/useApi";
import styles from "../admin/Admin.module.css";
import {
  DEFAULT_EDITS,
  type Handle,
  type Rect,
  aspectRatio,
  cssFilter,
  editsEqual,
  fitRatio,
  flipEdits,
  fractionRatio,
  growRect,
  moveRect,
  normalizeEdits,
  resizeRect,
  rotateEdits,
  rotatedSize,
} from "./geometry";
import e from "./Editor.module.css";

const HANDLES: Array<{ id: string; h: Handle }> = [
  { id: "nw", h: { dx: -1, dy: -1 } },
  { id: "n", h: { dx: 0, dy: -1 } },
  { id: "ne", h: { dx: 1, dy: -1 } },
  { id: "w", h: { dx: -1, dy: 0 } },
  { id: "e", h: { dx: 1, dy: 0 } },
  { id: "sw", h: { dx: -1, dy: 1 } },
  { id: "s", h: { dx: 0, dy: 1 } },
  { id: "se", h: { dx: 1, dy: 1 } },
];

export function PhotoEditor({ id }: { id: string }) {
  const api = useApi<AdminGalleryPhoto>(adminEndpoints.galleryPhoto(id));
  return <Loadable api={api}>{(photo) => <Editor key={`${photo.id}.${photo.version}`} photo={photo} reload={api.reload} />}</Loadable>;
}

function Editor({ photo, reload }: { photo: AdminGalleryPhoto; reload: () => void }) {
  const t = useTranslations("admin.gallery");
  const locale = useLocale() as AppLocale;
  const { run, pending } = useAction();
  const canEdit = photo.can.edit;
  const initial = useMemo<PhotoEdits>(() => photo.edits ?? DEFAULT_EDITS, [photo.edits]);
  const [edits, setEdits] = useState<PhotoEdits>(initial);
  const [caption, setCaption] = useState<I18nValue>(toI18n(photo.caption));
  const [alt, setAlt] = useState<I18nValue>(toI18n(photo.alt));
  const [setCover, setSetCover] = useState(photo.isCover);
  const [live, setLive] = useState("");
  const [reverting, setReverting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [imgError, setImgError] = useState(false);

  // Load the unedited original once.
  useEffect(() => {
    const el = new window.Image();
    el.onload = () => setImg(el);
    el.onerror = () => setImgError(true);
    el.src = photo.originalUrl;
  }, [photo.originalUrl]);

  const natural = img ? { w: img.naturalWidth, h: img.naturalHeight } : { w: photo.width ?? 4, h: photo.height ?? 3 };
  const rot = rotatedSize(natural.w, natural.h, edits.rotate);

  // --- canvas preview (rotate, flip; brightness/contrast via CSS filter for Safari) ---
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = canvas.current;
    if (!c || !img) return;
    const scale = Math.min(1, 1400 / Math.max(rot.w, rot.h));
    c.width = Math.max(1, Math.round(rot.w * scale));
    c.height = Math.max(1, Math.round(rot.h * scale));
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.save();
    ctx.translate(c.width / 2, c.height / 2);
    ctx.scale(edits.flipH ? -1 : 1, edits.flipV ? -1 : 1);
    ctx.rotate((edits.rotate * Math.PI) / 180);
    const w = natural.w * scale;
    const h = natural.h * scale;
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
  }, [img, edits.rotate, edits.flipH, edits.flipV, natural.w, natural.h, rot.w, rot.h]);

  // --- crop ---
  const stage = useRef<HTMLDivElement>(null);
  const crop = edits.crop;
  const rf = crop ? (aspectRatio(crop.aspect) === null ? null : fractionRatio(aspectRatio(crop.aspect)!, rot.w, rot.h)) : null;
  const setRect = useCallback((r: Rect, aspect?: CropAspect) => setEdits((cur) => ({ ...cur, crop: { ...r, aspect: aspect ?? cur.crop?.aspect ?? "free" } })), []);
  const pct = (n: number) => `${Math.round(n * 1000) / 10}%`;
  const say = (m: string) => setLive(m);

  const pickAspect = (a: CropAspect | "none") => {
    if (a === "none") {
      setEdits((cur) => ({ ...cur, crop: null }));
      return say(t("liveNoCrop"));
    }
    const ratio = aspectRatio(a);
    const box: Rect = crop ?? { x: 0, y: 0, w: 1, h: 1 };
    const r = ratio === null ? box : fitRatio(box, fractionRatio(ratio, rot.w, rot.h));
    setRect(r, a);
    say(t("liveAspect", { aspect: a === "free" ? t("aspect_free") : a }));
  };

  const drag = useRef<{ kind: "move" | "resize"; handle?: Handle; start: Rect; px: number; py: number } | null>(null);
  const toFrac = (ev: { clientX: number; clientY: number }) => {
    const b = stage.current!.getBoundingClientRect();
    return { px: (ev.clientX - b.left) / b.width, py: (ev.clientY - b.top) / b.height };
  };
  const begin = (ev: RPointerEvent<HTMLElement>, kind: "move" | "resize", handle?: Handle) => {
    if (!crop || !canEdit) return;
    ev.preventDefault();
    ev.stopPropagation();
    ev.currentTarget.setPointerCapture(ev.pointerId);
    const { px, py } = toFrac(ev);
    drag.current = { kind, handle, start: { x: crop.x, y: crop.y, w: crop.w, h: crop.h }, px, py };
  };
  const onMove = (ev: RPointerEvent<HTMLElement>) => {
    const d = drag.current;
    if (!d) return;
    const { px, py } = toFrac(ev);
    setRect(d.kind === "move" ? moveRect(d.start, px - d.px, py - d.py) : resizeRect(d.start, d.handle!, px, py, rf));
  };
  const end = () => {
    if (!drag.current || !crop) return (drag.current = null);
    drag.current = null;
    say(t("liveCrop", { w: pct(crop.w), h: pct(crop.h), x: pct(crop.x), y: pct(crop.y) }));
  };

  const onCropKey = (ev: KeyboardEvent<HTMLDivElement>) => {
    if (!crop || !canEdit || !ev.key.startsWith("Arrow")) return;
    ev.preventDefault();
    const step = ev.shiftKey ? 0.1 : 0.01;
    const sx = ev.key === "ArrowRight" ? 1 : ev.key === "ArrowLeft" ? -1 : 0;
    const sy = ev.key === "ArrowDown" ? 1 : ev.key === "ArrowUp" ? -1 : 0;
    const cur: Rect = { x: crop.x, y: crop.y, w: crop.w, h: crop.h };
    const next = ev.altKey ? growRect(cur, sx * step, sy * step, rf) : moveRect(cur, sx * step, sy * step);
    setRect(next);
    say(t("liveCrop", { w: pct(next.w), h: pct(next.h), x: pct(next.x), y: pct(next.y) }));
  };

  const normalized = normalizeEdits(edits);
  const editsChanged = !editsEqual(edits, photo.edits);
  const metaChanged = caption.en !== photo.caption.en || (caption.hi ?? "") !== (photo.caption.hi ?? "") || alt.en !== photo.alt.en || (alt.hi ?? "") !== (photo.alt.hi ?? "") || setCover !== photo.isCover;
  const dirty = editsChanged || metaChanged;

  const save = async () => {
    const meta = {
      caption: { en: caption.en.trim(), hi: caption.hi?.trim() || null },
      alt: { en: alt.en.trim(), hi: alt.hi?.trim() || null },
      ...(setCover && !photo.isCover ? { setCover: true } : {}),
    };
    // Captions only: no new derived file (and no new revision).
    const res = editsChanged
      ? await run<AdminGalleryPhoto>(adminEndpoints.galleryPhotoAction(photo.id, "edit"), { body: { version: photo.version, edits: normalized, ...meta } }, { key: "save", refresh: false, success: t("editorSaved"), onReload: reload, quiet422: true })
      : await run<AdminGalleryPhoto>(adminEndpoints.galleryPhoto(photo.id), { method: "PATCH", body: { version: photo.version, ...meta } }, { key: "save", refresh: false, success: t("editorSaved"), onReload: reload, quiet422: true });
    if (res.ok) {
      setErrors({});
      reload();
    } else if (res.status === 422) setErrors(res.error.fields ?? { form: res.error.message });
  };

  const revert = async () => {
    const res = await run(adminEndpoints.galleryPhotoAction(photo.id, "edit"), { body: { version: photo.version, edits: null } }, { key: "revert", refresh: false, success: t("reverted"), onReload: reload });
    if (res.ok) reload();
    return res.ok;
  };

  const rotate = (dir: 1 | -1) => {
    setEdits((cur) => rotateEdits(cur, dir));
    say(t("liveRotate", { deg: ((edits.rotate + (dir === 1 ? 90 : 270)) % 360) }));
  };
  const flip = (axis: "h" | "v") => {
    setEdits((cur) => flipEdits(cur, axis));
    say(axis === "h" ? t("liveFlipH") : t("liveFlipV"));
  };
  const reset = () => {
    setEdits(DEFAULT_EDITS);
    say(t("liveReset"));
  };

  const canCover = Boolean(photo.album) && photo.status === "approved";

  return (
    <div className={styles.page}>
      <PageHead
        back={photo.album ? { href: `/admin/gallery/albums/${photo.album.id}`, label: t("backToAlbum") } : { href: "/admin/gallery", label: t("backToReview") }}
        title={t("editorTitle")}
        sub={
          <>
            <Pill tone={photo.status === "approved" ? "green" : photo.status === "rejected" ? "slate" : "yellow"}>{t(`photoStatus_${photo.status}`)}</Pill>{" "}
            {photo.album ? tx(photo.album.title, locale) : t("noAlbum")} · {t("from", { from: photo.from })}
          </>
        }
      />
      <div className={e.layout}>
        <div className={`${e.stageWrap} ${e.sticky}`}>
          <div className={e.stageBox}>
            {imgError ? (
              <p role="alert">{t("imageFailed")}</p>
            ) : (
              <div className={e.stage} ref={stage}>
                <canvas ref={canvas} className={e.canvas} style={{ filter: cssFilter(edits), aspectRatio: `${rot.w} / ${rot.h}` }} role="img" aria-label={tx(photo.alt, locale) || t("photoAlt")} />
                {crop && img ? (
                  <span className={e.shade} aria-hidden="true">
                    <span className={e.shadeBox} style={{ left: pct(crop.x), top: pct(crop.y), width: pct(crop.w), height: pct(crop.h) }} />
                  </span>
                ) : null}
                {crop && img ? (
                  <div
                    className={e.crop}
                    style={{ left: pct(crop.x), top: pct(crop.y), width: pct(crop.w), height: pct(crop.h) }}
                    tabIndex={canEdit ? 0 : -1}
                    role="group"
                    aria-label={t("cropBox")}
                    aria-describedby="crop-help"
                    onKeyDown={onCropKey}
                    onPointerDown={(ev) => begin(ev, "move")}
                    onPointerMove={onMove}
                    onPointerUp={end}
                    onPointerCancel={end}
                  >
                    <span className={e.cropGrid} aria-hidden="true" />
                    {canEdit
                      ? HANDLES.map(({ id, h }) => (
                          <span
                            key={id}
                            className={`${e.handle} ${e[`h-${id}`]}`}
                            aria-hidden="true"
                            onPointerDown={(ev) => begin(ev, "resize", h)}
                            onPointerMove={onMove}
                            onPointerUp={end}
                            onPointerCancel={end}
                          />
                        ))
                      : null}
                  </div>
                ) : null}
              </div>
            )}
          </div>
          <p className={e.hint} id="crop-help">
            {crop ? t("cropHelp") : t("cropHelpNone")}
          </p>
          <p className={e.live} role="status" aria-live="polite">
            {live}
          </p>
          <p className={e.meta}>
            {photo.width && photo.height ? `${photo.width} × ${photo.height} px · ` : ""}
            {t("revision", { n: photo.revision })}
          </p>
        </div>

        <div className={e.controls}>
          <fieldset className={e.group} disabled={!canEdit}>
            <legend className={e.legend}>{t("transform")}</legend>
            <div className={e.btns}>
              <button type="button" className={e.tbtn} onClick={() => rotate(-1)} aria-label={t("rotateLeft")}>
                <Icon icon={RotateCcw} size={18} />
              </button>
              <button type="button" className={e.tbtn} onClick={() => rotate(1)} aria-label={t("rotateRight")}>
                <Icon icon={RotateCw} size={18} />
              </button>
              <button type="button" className={e.tbtn} aria-pressed={edits.flipH} onClick={() => flip("h")} aria-label={t("flipH")}>
                <Icon icon={FlipHorizontal2} size={18} />
              </button>
              <button type="button" className={e.tbtn} aria-pressed={edits.flipV} onClick={() => flip("v")} aria-label={t("flipV")}>
                <Icon icon={FlipVertical2} size={18} />
              </button>
            </div>
          </fieldset>

          <fieldset className={e.group} disabled={!canEdit}>
            <legend className={e.legend}>{t("cropLegend")}</legend>
            <div className={e.btns} role="group" aria-label={t("cropLegend")}>
              <button type="button" className={e.tbtn} aria-pressed={!crop} onClick={() => pickAspect("none")}>
                {t("noCrop")}
              </button>
              {CROP_ASPECTS.map((a) => (
                <button key={a} type="button" className={e.tbtn} aria-pressed={crop?.aspect === a} onClick={() => pickAspect(a)}>
                  {a === "free" ? t("aspect_free") : a}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className={e.group} disabled={!canEdit}>
            <legend className={e.legend}>{t("adjust")}</legend>
            <div className={e.slider}>
              <label htmlFor="ed-bright">{t("brightness")}</label>
              <output htmlFor="ed-bright">{edits.brightness}</output>
              <input id="ed-bright" type="range" min={-100} max={100} step={1} value={edits.brightness} onChange={(ev) => setEdits((c) => ({ ...c, brightness: Number(ev.target.value) }))} />
            </div>
            <div className={e.slider}>
              <label htmlFor="ed-contrast">{t("contrast")}</label>
              <output htmlFor="ed-contrast">{edits.contrast}</output>
              <input id="ed-contrast" type="range" min={-100} max={100} step={1} value={edits.contrast} onChange={(ev) => setEdits((c) => ({ ...c, contrast: Number(ev.target.value) }))} />
            </div>
          </fieldset>

          <div className={e.actions}>
            <Button variant="outline" onClick={reset} disabled={!canEdit || editsEqual(edits, null)}>
              {t("reset")}
            </Button>
            {photo.edits || photo.revision > 0 ? (
              <Button variant="outline" onClick={() => setReverting(true)} disabled={!canEdit}>
                <Icon icon={Undo2} size={18} />
                {t("revert")}
              </Button>
            ) : null}
          </div>

          <div className={e.group}>
            <I18nFields label={t("caption")} value={caption} onChange={setCaption} multiline rows={2} requiredEn={false} maxLength={300} error={errors.caption ?? errors["caption.en"]} />
            <I18nFields label={t("altText")} value={alt} onChange={setAlt} requiredEn={false} maxLength={200} error={errors.alt ?? errors["alt.en"]} />
            <p className={e.meta}>{t("altHint")}</p>
            {photo.album ? <Checkbox label={t("useAsCover")} checked={setCover} disabled={!canEdit || !canCover || photo.isCover} onChange={(ev) => setSetCover(ev.target.checked)} /> : null}
            {photo.album && !canCover ? <p className={e.meta}>{t("coverNeedsApproved")}</p> : null}
          </div>

          {canEdit ? (
            <div className={e.actions}>
              <Button pending={pending === "save"} disabled={!dirty} onClick={save}>
                {t("save")}
              </Button>
            </div>
          ) : (
            <p className={e.meta}>{t("readOnly")}</p>
          )}
          {errors.form ? <p role="alert">{errors.form}</p> : null}
        </div>
      </div>
      <ConfirmDialog open={reverting} onClose={() => setReverting(false)} title={t("revertTitle")} body={<p>{t("revertBody")}</p>} confirmLabel={t("revert")} pending={pending === "revert"} onConfirm={revert} />
    </div>
  );
}
