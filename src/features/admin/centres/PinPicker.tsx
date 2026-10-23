"use client";

// Leaflet pin picker: click the map or drag the marker; lat/lng inputs are the keyboard fallback.
import "leaflet/dist/leaflet.css";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import type { Map as LeafletMap, Marker } from "leaflet";
import type { Geo } from "@/contract";
import { NCR_CENTRE } from "@/features/map/model";
import { Input } from "@/ui/Input";
import styles from "./Centres.module.css";

const round = (n: number) => Math.round(n * 1e6) / 1e6;

export function PinPicker({ value, onChange, error }: { value: Geo | null; onChange: (g: Geo | null) => void; error?: string }) {
  const t = useTranslations("admin.centres");
  const host = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const cb = useRef(onChange);
  useEffect(() => {
    cb.current = onChange;
  });
  const initial = useRef(value);

  useEffect(() => {
    let dead = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (dead || !host.current) return;
      const start = initial.current;
      const map = L.map(host.current, { scrollWheelZoom: false }).setView(start ? [start.lat, start.lng] : [NCR_CENTRE.lat, NCR_CENTRE.lng], start ? 15 : NCR_CENTRE.zoom);
      mapRef.current = map;
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>' }).addTo(map);
      const icon = L.divIcon({ className: styles.pinWrap, html: `<span class="${styles.pin}"></span>`, iconSize: [28, 28], iconAnchor: [14, 28] });
      const place = (lat: number, lng: number) => {
        if (markerRef.current) markerRef.current.setLatLng([lat, lng]);
        else {
          const m = L.marker([lat, lng], { icon, draggable: true, keyboard: true }).addTo(map);
          m.on("dragend", () => {
            const p = m.getLatLng();
            cb.current({ lat: round(p.lat), lng: round(p.lng) });
          });
          markerRef.current = m;
        }
      };
      if (start) place(start.lat, start.lng);
      map.on("click", (e) => {
        place(e.latlng.lat, e.latlng.lng);
        cb.current({ lat: round(e.latlng.lat), lng: round(e.latlng.lng) });
      });
      (map as unknown as { _place: typeof place })._place = place;
      const ro = new ResizeObserver(() => map.invalidateSize());
      ro.observe(host.current);
      map.on("unload", () => ro.disconnect());
    })();
    return () => {
      dead = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  // Keep the marker in step with typed coordinates.
  useEffect(() => {
    const map = mapRef.current as (LeafletMap & { _place?: (a: number, b: number) => void }) | null;
    if (!map || !value) return;
    map._place?.(value.lat, value.lng);
  }, [value]);

  const set = (key: "lat" | "lng", raw: string) => {
    if (raw === "" && !value) return;
    const n = Number(raw);
    if (Number.isNaN(n)) return;
    const base = value ?? { lat: NCR_CENTRE.lat, lng: NCR_CENTRE.lng };
    onChange({ ...base, [key]: n });
  };

  return (
    <div className={styles.pinBox}>
      <div ref={host} className={styles.pinMap} role="region" aria-label={t("mapLabel")} />
      <p className={styles.hint}>{t("mapHint")}</p>
      <div className={styles.latlng}>
        <Input label={t("lat")} type="number" step="any" inputMode="decimal" value={value?.lat ?? ""} onChange={(e) => set("lat", e.target.value)} error={error} />
        <Input label={t("lng")} type="number" step="any" inputMode="decimal" value={value?.lng ?? ""} onChange={(e) => set("lng", e.target.value)} />
      </div>
      {value ? (
        <button type="button" className={styles.linkBtn} onClick={() => onChange(null)}>
          {t("clearPin")}
        </button>
      ) : null}
    </div>
  );
}
