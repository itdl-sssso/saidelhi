"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Link } from "@/i18n/navigation";
import styles from "./HomeMap.module.css";

export type PreviewPin = { lat: number; lng: number };

// Leaflet is only fetched once the preview scrolls near the viewport (never on the LCP path).
const PreviewCanvas = dynamic(() => import("./PreviewCanvas"), { ssr: false });

/**
 * Home "find a centre" map: a real OpenStreetMap view of the centre pins that cannot be
 * dragged, zoomed or focused. The whole frame is one link to /centres/map. The box has a fixed
 * height from first paint, so loading the map never moves the layout.
 */
export function HomeMapPreview({ pins, label }: { pins: PreviewPin[]; label: string }) {
  const frame = useRef<HTMLAnchorElement>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") return; // no observer: the static frame still links to the map
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: "300px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Link ref={frame} href="/centres/map" className={styles.frame} aria-label={label}>
      <span className={styles.canvas} aria-hidden="true">
        {near ? <PreviewCanvas pins={pins} /> : null}
      </span>
      <span className={styles.cover} aria-hidden="true" />
    </Link>
  );
}
