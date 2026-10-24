"use client";

import { useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useHydrated } from "@/lib/useHydrated";
import { Button } from "@/ui/Button";
import { Skeleton } from "@/ui/Skeleton";
import type { MapLabels, Pin } from "./CentreMap";
import styles from "./Map.module.css";

const CentreMap = dynamic(() => import("./CentreMap"), {
  ssr: false,
  loading: () => <Skeleton width="100%" height={460} radius={12} />,
});

/**
 * Desktop: map left, list right. Phone: list first with a "Show map" toggle.
 * Without JavaScript only the list is rendered (it carries everything the map does).
 */
export function MapBrowser({ pins, labels, children }: { pins: Pin[]; labels: MapLabels; children: ReactNode }) {
  const t = useTranslations("map");
  const hydrated = useHydrated();
  const [showMap, setShowMap] = useState(false);
  // Layout is decided on the server (pins exist) so hydration does not reflow the list; only the map itself waits.
  const canMap = pins.length > 0;

  return (
    <div className={styles.browser} data-map={canMap ? (showMap ? "open" : "closed") : "off"}>
      {canMap ? (
        <div className={styles.toggle}>
          <Button variant="outline" size="sm" icon={showMap ? "list" : "map"} aria-pressed={showMap} disabled={!hydrated} onClick={() => setShowMap((v) => !v)}>
            {showMap ? t("showList") : t("showMap")}
          </Button>
        </div>
      ) : null}
      {canMap ? (
        <div className={styles.mapPane}>
          {hydrated ? <CentreMap pins={pins} labels={labels} /> : <Skeleton width="100%" height={460} radius={12} />}
        </div>
      ) : null}
      <div className={styles.listPane}>{children}</div>
    </div>
  );
}
