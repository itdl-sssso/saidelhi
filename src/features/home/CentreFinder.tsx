import { useLocale, useTranslations } from "next-intl";
import type { CentreListItem } from "@/contract";
import { Link } from "@/i18n/navigation";
import { type AppLocale, formatTime, istParts, tx, weekdayName } from "@/lib/format";
import { Button } from "@/ui/Button";
import { cx } from "@/ui/cx";
import { Icon } from "@/ui/Icon";
import { SectionHeading } from "@/ui/SectionHeading";
import { HomeMapPreview } from "./HomeMapPreview";
import styles from "./HomeSections.module.css";

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
    <section id="where" className={cx(styles.sec, styles.white)} aria-labelledby="finder-title">
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
        <HomeMapPreview pins={pinned.map((c) => ({ lat: c.geo!.lat, lng: c.geo!.lng }))} label={t("mapPreviewAlt", { count: pinned.length })} />
      </div>
    </section>
  );
}

