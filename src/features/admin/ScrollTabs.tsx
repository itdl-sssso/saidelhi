"use client";

// Pill tab strip that side-scrolls instead of wrapping: edge fades show there is more, the active tab is
// scrolled into view on mount, and a vertical mouse wheel / mouse drag scrolls it sideways on desktop.
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { cx } from "@/ui/cx";
import styles from "./Admin.module.css";

export function ScrollTabs({ label, children }: { label: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ start: false, end: false });
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null);

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const x = Math.abs(el.scrollLeft);
    setEdge({ start: x > 2, end: x < max - 2 });
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.querySelector<HTMLElement>('[aria-current="page"]')?.scrollIntoView({ inline: "center", block: "nearest" });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    const onWheel = (e: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      ro.disconnect();
      el.removeEventListener("wheel", onWheel);
    };
  }, [measure]);

  return (
    <div className={cx(styles.tabsWrap, edge.start && styles.fadeStart, edge.end && styles.fadeEnd)}>
      <div
        ref={ref}
        className={styles.tabs}
        role="navigation"
        aria-label={label}
        onScroll={measure}
        onPointerDown={(e) => {
          if (e.pointerType === "mouse") drag.current = { x: e.clientX, left: ref.current?.scrollLeft ?? 0, moved: false };
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d || !ref.current) return;
          const dx = e.clientX - d.x;
          if (Math.abs(dx) > 5) d.moved = true;
          if (d.moved) ref.current.scrollLeft = d.left - dx;
        }}
        onPointerUp={() => {
          setTimeout(() => {
            drag.current = null;
          }, 0);
        }}
        onClickCapture={(e) => {
          if (drag.current?.moved) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
      >
        {children}
      </div>
    </div>
  );
}
