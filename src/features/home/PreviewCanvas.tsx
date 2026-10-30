"use client";

// Non-interactive Leaflet + OpenStreetMap view for the Home page (same tiles as /centres/map).
import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import type { Map as LeafletMap } from "leaflet";
import { NCR_CENTRE } from "@/features/map/model";
import type { PreviewPin } from "./HomeMapPreview";
import styles from "./HomeMap.module.css";

export default function PreviewCanvas({ pins }: { pins: PreviewPin[] }) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    let map: LeafletMap | undefined;
    let observer: ResizeObserver | undefined;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !host.current) return;
      map = L.map(host.current, {
        zoomControl: false,
        dragging: false,
        touchZoom: false,
        doubleClickZoom: false,
        scrollWheelZoom: false,
        boxZoom: false,
        keyboard: false,
        tap: false,
        attributionControl: true,
      } as L.MapOptions).setView([NCR_CENTRE.lat, NCR_CENTRE.lng], NCR_CENTRE.zoom);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" tabindex="-1">OpenStreetMap</a>',
      }).addTo(map);
      const dot = L.divIcon({ className: styles.pinWrap, html: `<span class="${styles.pin}"></span>`, iconSize: [18, 18], iconAnchor: [9, 9] });
      for (const p of pins) L.marker([p.lat, p.lng], { icon: dot, interactive: false, keyboard: false }).addTo(map);

      const fit = () => {
        if (!map) return;
        if (pins.length > 1) map.fitBounds(L.latLngBounds(pins.map((p) => [p.lat, p.lng] as [number, number])), { padding: [36, 36], maxZoom: 12, animate: false });
        else if (pins.length === 1) map.setView([pins[0].lat, pins[0].lng], 12, { animate: false });
      };
      fit();
      observer = new ResizeObserver(() => {
        map?.invalidateSize();
        fit();
      });
      observer.observe(host.current);
    })();
    return () => {
      cancelled = true;
      observer?.disconnect();
      map?.remove();
    };
  }, [pins]);

  return <div ref={host} className={styles.leaflet} />;
}
