"use client";

// Accessible photo lightbox on a native <dialog> (focus trap, Esc, focus return come from the platform).
// Arrow keys and swipe move between photos; the counter and caption are announced politely.
import Image from "next/image";
import { useTranslations } from "next-intl";
import { type KeyboardEvent, type PointerEvent, useCallback, useEffect, useRef, useState } from "react";
import { useNativeDialog } from "@/ui/Dialog/useNativeDialog";
import { Icon } from "@/ui/Icon";
import styles from "./Gallery.module.css";

export interface LightboxItem {
  src: string;
  width: number | null;
  height: number | null;
  alt: string;
  caption: string | null;
  /** Text is English although the page is Hindi. */
  enFallback: boolean;
}

export function PhotoGrid({ items, label }: { items: LightboxItem[]; label: string }) {
  const t = useTranslations("gallery");
  const [index, setIndex] = useState<number | null>(null);
  return (
    <>
      <ul className={styles.photos} aria-label={label}>
        {items.map((it, i) => (
          <li key={`${it.src}-${i}`} className={styles.photoItem}>
            <a
              href={it.src}
              className={styles.photoLink}
              aria-haspopup="dialog"
              aria-label={t("openPhoto", { n: i + 1, total: items.length, alt: it.alt })}
              onClick={(e) => {
                e.preventDefault();
                setIndex(i);
              }}
            >
              <Image src={it.src} alt="" fill sizes="(min-width: 960px) 25vw, (min-width: 640px) 33vw, 50vw" />
            </a>
          </li>
        ))}
      </ul>
      <Lightbox items={items} index={index} onIndex={setIndex} onClose={() => setIndex(null)} />
    </>
  );
}

function Lightbox({ items, index, onIndex, onClose }: { items: LightboxItem[]; index: number | null; onIndex: (i: number) => void; onClose: () => void }) {
  const t = useTranslations("gallery");
  const open = index !== null;
  const dialog = useNativeDialog(open, onClose);
  const closeRef = useRef<HTMLButtonElement>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const total = items.length;
  const cur = index ?? 0;
  const item = items[cur];

  const go = useCallback((d: 1 | -1) => onIndex((cur + d + total) % total), [cur, total, onIndex]);

  // Warm the neighbours so arrow/swipe feels instant.
  useEffect(() => {
    if (!open) return;
    for (const d of [1, -1]) {
      const n = items[(cur + d + total) % total];
      if (n) new window.Image().src = n.src;
    }
  }, [open, cur, items, total]);

  const onKey = (e: KeyboardEvent<HTMLDialogElement>) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      go(1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      go(-1);
    } else if (e.key === "Home") {
      e.preventDefault();
      onIndex(0);
    } else if (e.key === "End") {
      e.preventDefault();
      onIndex(total - 1);
    }
  };
  const down = (e: PointerEvent) => {
    start.current = { x: e.clientX, y: e.clientY };
  };
  const up = (e: PointerEvent) => {
    const s = start.current;
    start.current = null;
    if (!s) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? 1 : -1);
  };

  return (
    <dialog {...dialog} className={styles.lb} aria-label={t("lightbox")} onKeyDown={onKey}>
      {open && item ? (
        <div className={styles.lbInner}>
          <div className={styles.lbBar}>
            <p className={styles.lbCount} role="status" aria-live="polite" aria-atomic="true">
              {t("counter", { n: cur + 1, total })}
            </p>
            <button ref={closeRef} type="button" className={styles.lbBtn} onClick={onClose} aria-label={t("close")} autoFocus>
              <Icon name="x" size={24} />
            </button>
          </div>
          <div className={styles.lbStage} onPointerDown={down} onPointerUp={up} onPointerCancel={() => (start.current = null)}>
            <button type="button" className={`${styles.lbBtn} ${styles.lbPrev}`} onClick={() => go(-1)} aria-label={t("prev")}>
              <Icon name="chevron-left" size={24} />
            </button>
            <div className={styles.lbImg}>
              <Image key={item.src} src={item.src} alt={item.alt} fill sizes="100vw" priority draggable={false} />
            </div>
            <button type="button" className={`${styles.lbBtn} ${styles.lbNext}`} onClick={() => go(1)} aria-label={t("next")}>
              <Icon name="chevron-right" size={24} />
            </button>
          </div>
          {item.caption ? (
            <p className={styles.lbCaption} lang={item.enFallback ? "en" : undefined}>
              {item.caption}
            </p>
          ) : null}
        </div>
      ) : null}
    </dialog>
  );
}
