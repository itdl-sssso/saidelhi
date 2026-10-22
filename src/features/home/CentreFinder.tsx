import { useLocale, useTranslations } from "next-intl";
import type { CentreListItem } from "@/contract";
import { Link } from "@/i18n/navigation";
import { type AppLocale, formatTime, istParts, tx, weekdayName } from "@/lib/format";
import { Button } from "@/ui/Button";
import { Icon } from "@/ui/Icon";
import { SectionHeading } from "@/ui/SectionHeading";
import styles from "./HomeSections.module.css";

// Rough bounding box of Delhi NCR for the schematic preview (lat/lng → SVG units).
const BOX = { west: 76.95, east: 77.45, north: 28.78, south: 28.38 };
const W = 400;
const H = 320;

/**
 * Spec 01 §9: search by pincode or locality (goes to the centre map, M5) with a small
 * schematic map preview and the next few gatherings.
 */
export function CentreFinder({ centres }: { centres: CentreListItem[] }) {
  const t = useTranslations("home");
  const tg = useTranslations("gathering");
  const locale = useLocale() as AppLocale;
  const pinned = centres.filter((c) => c.geo);
  const soonest = [...centres]
    .filter((c) => c.nextGathering)
    .sort((a, b) => Date.parse(a.nextGathering!.at) - Date.parse(b.nextGathering!.at))
    .slice(0, 3);

  return (
    <section id="where" className={styles.sec} aria-labelledby="finder-title">
      <div className={`${styles.wrap} ${styles.finder}`}>
        <div>
          <SectionHeading titleId="finder-title" eyebrow={t("finderEyebrow")} title={t("finderTitle")} description={t("finderLead")} />
          <form action="/centres/map" method="get" className={styles.pin} role="search">
            <label className={styles.pinField}>
              <span className={styles.pinLabel}>{t("finderLabel")}</span>
              <span className={styles.ctl}>
                <Icon name="map-pin" size={18} />
                <input name="q" type="search" placeholder={t("finderPlaceholder")} autoComplete="postal-code" maxLength={80} />
              </span>
            </label>
            <Button type="submit" icon="search">
              {t("finderSubmit")}
            </Button>
          </form>
          {soonest.length ? (
            <ul className={styles.near} aria-label={t("finderNext")}>
              {soonest.map((c) => {
                const g = c.nextGathering!;
                const p = istParts(g.at);
                return (
                  <li key={c.id}>
                    <span>
                      <b>{tx(c.name, locale)}</b>
                      <span>
                        {tg(g.kind)} · {weekdayName(p.dow, locale)} {formatTime(g.at, locale)}
                      </span>
                    </span>
                    <Link href={`/centres/${c.slug}`} aria-label={t("openCentre", { name: tx(c.name, locale) })}>
                      {t("open")}
                      <Icon name="arrow-right" size={16} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : null}
          <div className={styles.finderCta}>
            <Button href="/centres/map" variant="secondary" icon="map" iconAfter="arrow-right">
              {t("allCentresMap")}
            </Button>
          </div>
        </div>
        <Link href="/centres/map" className={styles.mapPreview} aria-label={t("allCentresMap")}>
          <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t("mapPreviewAlt", { count: pinned.length })}>
            <defs>
              <pattern id="finder-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M40 0H0V40" fill="none" stroke="var(--blue-100)" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width={W} height={H} fill="var(--surface-calm)" />
            <rect width={W} height={H} fill="url(#finder-grid)" />
            {/* The Yamuna, roughly. */}
            <path d="M232 0 C 236 70, 250 120, 246 170 S 262 260, 280 320" fill="none" stroke="var(--blue-200)" strokeWidth="10" strokeLinecap="round" />
            {pinned.map((c) => {
              const x = ((c.geo!.lng - BOX.west) / (BOX.east - BOX.west)) * W;
              const y = ((BOX.north - c.geo!.lat) / (BOX.north - BOX.south)) * H;
              return (
                <g key={c.id}>
                  <circle cx={x} cy={y} r="11" fill="var(--white)" opacity="0.9" />
                  <circle cx={x} cy={y} r="7" fill="var(--pink-500)" stroke="var(--white)" strokeWidth="2" />
                </g>
              );
            })}
          </svg>
        </Link>
      </div>
    </section>
  );
}

