import { useLocale, useTranslations } from "next-intl";
import type { CentreListItem } from "@/contract";
import { Link } from "@/i18n/navigation";
import { type AppLocale, formatDayMonth, formatTime, tx } from "@/lib/format";
import { ExternalLink, LocalText, PageHero, pub } from "@/features/public/parts";
import { GATHERING_ICON } from "@/features/public/seva";
import { Button } from "@/ui/Button";
import { cx } from "@/ui/cx";
import { EmptyState } from "@/ui/EmptyState";
import { Icon } from "@/ui/Icon";
import { Select } from "@/ui/Select";
import type { Pin } from "./CentreMap";
import { MapBrowser } from "./MapBrowser";
import { directionsUrl, formatKm } from "./model";
import styles from "./Map.module.css";

export type MapViewProps = {
  centres: CentreListItem[];
  /** Raw search text as typed (pincode or locality). */
  q: string;
  pincode: string | null;
  district: string;
  districts: { value: string; label: string }[];
};

export function MapView({ centres, q, pincode, district, districts }: MapViewProps) {
  const t = useTranslations("map");
  const locale = useLocale() as AppLocale;
  const searched = Boolean(q || district);

  const pins: Pin[] = centres.flatMap((c, i) =>
    c.geo
      ? [
          {
            n: i + 1,
            slug: c.slug,
            name: tx(c.name, locale),
            address: tx(c.address, locale),
            lat: c.geo.lat,
            lng: c.geo.lng,
            href: `/${locale === "hi" ? "hi/" : ""}centres/${c.slug}`.replace(/\/$/, ""),
            directionsHref: directionsUrl({ address: tx(c.address, locale), geo: c.geo }),
          },
        ]
      : [],
  );
  const near = pincode ? t("countNear", { count: centres.length, pincode }) : t("count", { count: centres.length });

  return (
    <>
      <PageHero
        className={styles.hero}
        crumbs={[{ label: t("crumbHome"), href: "/" }, { label: t("crumbCentres") }, { label: t("crumbMap") }]}
      >
        <h1 className={pub.h1}>{t("title")}</h1>
        <form action="/centres/map" method="get" role="search" className={styles.search}>
          <label className={styles.field}>
            <span className={styles.label}>{t("searchLabel")}</span>
            <span className={styles.ctl}>
              <Icon name="search" size={18} />
              <input name="q" type="search" defaultValue={q} placeholder={t("searchPlaceholder")} maxLength={80} autoComplete="postal-code" />
            </span>
          </label>
          <Select name="district" label={t("districtLabel")} defaultValue={district} options={[{ value: "", label: t("allDistricts") }, ...districts]} />
          <Button type="submit" icon="search">
            {t("search")}
          </Button>
        </form>
        <p className={pub.cap}>{t("privacyNote")}</p>
      </PageHero>

      <section className={pub.section} style={{ paddingTop: "var(--space-4)" }}>
        <div className={pub.wrap}>
          {centres.length ? (
            <>
              <p className={styles.count} role="status">
                {near}
              </p>
              <MapBrowser pins={pins} labels={{ open: t("openCentre"), directions: t("directions"), region: t("mapRegion") }}>
                <ol className={styles.list}>
                  {centres.map((c, i) => (
                    <CentreRow key={c.slug} centre={c} n={i + 1} pinned={Boolean(c.geo)} />
                  ))}
                </ol>
              </MapBrowser>
            </>
          ) : (
            <div className={pub.card}>
              <EmptyState
                icon="map-pin"
                headingLevel={2}
                title={t("emptyTitle")}
                body={searched ? (pincode ? t("emptyPincode", { pincode }) : t("emptyBody")) : t("emptyAll")}
                action={
                  searched ? (
                    <Button href="/centres/map" variant="outline">
                      {t("clear")}
                    </Button>
                  ) : undefined
                }
              />
            </div>
          )}
        </div>
      </section>
    </>
  );
}

function CentreRow({ centre: c, n, pinned }: { centre: CentreListItem; n: number; pinned: boolean }) {
  const t = useTranslations("map");
  const tg = useTranslations("gathering");
  const locale = useLocale() as AppLocale;
  const km = formatKm(c.distanceKm, locale);
  const address = tx(c.address, locale);
  return (
    <li className={styles.row}>
      <span className={cx(styles.num, !pinned && styles.numQuiet)} aria-hidden="true">
        {n}
      </span>
      <div className={styles.rowBody}>
        <Link href={`/centres/${c.slug}`} className={styles.name}>
          <LocalText value={c.name} />
        </Link>
        <span className={styles.meta}>
          <LocalText value={c.district.name} />
          {km ? <> · {t("away", { km })}</> : null}
        </span>
        <span className={styles.meta}>{address}</span>
        {c.nextGathering ? (
          <span className={styles.meta}>
            <Icon name={GATHERING_ICON[c.nextGathering.kind]} size={16} />
            {tg(c.nextGathering.kind)}: {formatDayMonth(c.nextGathering.at, locale)}, {formatTime(c.nextGathering.at, locale)}
          </span>
        ) : null}
        <span className={styles.actions}>
          <Link href={`/centres/${c.slug}`} className={pub.more}>
            {t("openCentre")}
            <Icon name="arrow-right" size={16} />
          </Link>
          <ExternalLink className={pub.more} href={directionsUrl({ address, geo: c.geo })}>
            {t("directions")}
          </ExternalLink>
        </span>
      </div>
    </li>
  );
}
