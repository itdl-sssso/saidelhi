"use client";

// Leaflet + OpenStreetMap tiles (no key). Loaded only in the browser, via `next/dynamic`.
import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import type { Map as LeafletMap } from "leaflet";
import { NCR_CENTRE } from "./model";
import styles from "./Map.module.css";

export type Pin = {
  n: number;
  slug: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  href: string;
  directionsHref: string;
};

export type MapLabels = { open: string; directions: string; region: string };

export default function CentreMap({ pins, labels }: { pins: Pin[]; labels: MapLabels }) {
  const host = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);

  useEffect(() => {
    let cancelled = false;
    let observer: ResizeObserver | undefined;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !host.current) return;
      const map = L.map(host.current, { scrollWheelZoom: false, zoomControl: true }).setView([NCR_CENTRE.lat, NCR_CENTRE.lng], NCR_CENTRE.zoom);
      mapRef.current = map;
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
      }).addTo(map);

      for (const p of pins) {
        const icon = L.divIcon({
          className: styles.pinWrap,
          html: `<span class="${styles.pin}"><span class="${styles.pinN}">${p.n}</span></span>`,
          iconSize: [32, 32],
          iconAnchor: [16, 32],
          popupAnchor: [0, -30],
        });
        // Markers are keyboard focusable (Enter opens the popup) and carry the centre name.
        const marker = L.marker([p.lat, p.lng], { icon, title: p.name, alt: p.name, keyboard: true }).addTo(map);
        const box = document.createElement("div");
        box.className = styles.popup;
        const h = document.createElement("strong");
        h.textContent = p.name;
        const addr = document.createElement("span");
        addr.textContent = p.address;
        const open = document.createElement("a");
        open.href = p.href;
        open.textContent = labels.open;
        const dir = document.createElement("a");
        dir.href = p.directionsHref;
        dir.target = "_blank";
        dir.rel = "noopener noreferrer";
        dir.textContent = labels.directions;
        box.append(h, addr, open, dir);
        marker.bindPopup(box);
      }

      const fit = () => {
        if (pins.length > 1) map.fitBounds(L.latLngBounds(pins.map((p) => [p.lat, p.lng] as [number, number])), { padding: [40, 40], maxZoom: 14 });
        else if (pins.length === 1) map.setView([pins[0].lat, pins[0].lng], 14);
      };
      // The pane is hidden on phones until "Show map" (zero size): fit the pins once it has a size,
      // and re-measure whenever its size changes.
      let fitted = false;
      observer = new ResizeObserver(() => {
        map.invalidateSize();
        if (!fitted && host.current && host.current.clientWidth > 0) {
          fitted = true;
          fit();
        }
      });
      observer.observe(host.current);
    })();
    return () => {
      cancelled = true;
      observer?.disconnect();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [pins, labels]);

  return <div ref={host} className={styles.canvas} role="region" aria-label={labels.region} />;
}
