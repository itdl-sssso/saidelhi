import type { CSSProperties } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { DistrictImpact } from "@/contract";
import { Link } from "@/i18n/navigation";
import { type AppLocale, tx } from "@/lib/format";
import { cx } from "@/ui/cx";
import { formatCount, isSuppressed, plotValue } from "@/ui/data/format";
import { FigureValue } from "@/ui/Figure";
import styles from "./DistrictMap.module.css";

/**
 * Schematic tile map of the nine placeholder districts, placed roughly where they sit
 * around Delhi. A real GeoJSON choropleth replaces this once boundaries are confirmed.
 */
const LAYOUT: Record<string, { col: number; row: number }> = {
  north: { col: 2, row: 1 },
  west: { col: 1, row: 2 },
  central: { col: 2, row: 2 },
  east: { col: 3, row: 2 },
  "noida-ghaziabad": { col: 4, row: 3 },
  "new-delhi": { col: 2, row: 3 },
  south: { col: 3, row: 3 },
  gurugram: { col: 1, row: 4 },
  faridabad: { col: 3, row: 4 },
};

const value = (d: DistrictImpact) => plotValue(d.activities.value);

/** Five-step sequential blue scale; 0 = no approved activity. */
function bin(v: number, max: number): number {
  if (v <= 0 || max <= 0) return 0;
  return Math.min(5, Math.max(1, Math.ceil((v / max) * 5)));
}

export function DistrictMap({ districts, periodLabel }: { districts: DistrictImpact[]; periodLabel: string }) {
  const t = useTranslations("impact");
  const locale = useLocale() as AppLocale;
  const max = Math.max(0, ...districts.map(value));
  const placed = districts.filter((d) => LAYOUT[d.district.slug]);
  const extra = districts.filter((d) => !LAYOUT[d.district.slug]);

  const tile = (d: DistrictImpact, style?: CSSProperties) => {
    const v = d.activities.value;
    const name = tx(d.district.name, locale);
    const text =
      v === null || (typeof v === "number" && v === 0)
        ? t("noActivity")
        : isSuppressed(v)
          ? t("activitiesFewer")
          : t("activitiesCount", { count: v, formatted: formatCount(v, locale) });
    return (
      <li key={d.district.id} style={style}>
        <Link
          href={`/districts/${d.district.slug}`}
          className={cx(styles.tile, styles[`b${bin(value(d), max)}`])}
          aria-label={`${name}: ${text}`}
        >
          <span className={styles.name}>{name}</span>
          <span className={styles.val}>{v === null || v === 0 ? "—" : <FigureValue value={v} inline />}</span>
        </Link>
      </li>
    );
  };

  return (
    <figure className={styles.figure}>
      <ul className={styles.grid} aria-label={t("mapLabel", { period: periodLabel })}>
        {placed.map((d) => tile(d, { gridColumn: LAYOUT[d.district.slug].col, gridRow: LAYOUT[d.district.slug].row }))}
      </ul>
      {extra.length ? <ul className={styles.extra}>{extra.map((d) => tile(d))}</ul> : null}
      <figcaption className={styles.legend}>
        <span>{t("legendFewer")}</span>
        {[1, 2, 3, 4, 5].map((b) => (
          <i key={b} className={styles[`b${b}`]} aria-hidden="true" />
        ))}
        <span>{t("legendMore")}</span>
        <span className={styles.legendNone}>
          <i className={styles.b0} aria-hidden="true" />
          {t("noActivity")}
        </span>
      </figcaption>
    </figure>
  );
}

/** Same data as a ranked list with bars: the map's table fallback, and the phone layout. */
export function DistrictRanking({ districts, caption }: { districts: DistrictImpact[]; caption: string }) {
  const t = useTranslations("impact");
  const locale = useLocale() as AppLocale;
  const sorted = [...districts].sort((a, b) => value(b) - value(a) || a.district.name.en.localeCompare(b.district.name.en));
  const max = Math.max(1, ...sorted.map(value));
  return (
    <table className={styles.rank}>
      <caption className="sr-only">{caption}</caption>
      <thead>
        <tr>
          <th scope="col">{t("colDistrict")}</th>
          <th scope="col" className={styles.numCol}>
            {t("colActivities")}
          </th>
          <th scope="col" className={cx(styles.numCol, styles.served)}>
            {t("colServed")}
          </th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((d) => {
          const v = d.activities.value;
          const none = v === null || v === 0;
          return (
            <tr key={d.district.id}>
              <th scope="row">
                <Link href={`/districts/${d.district.slug}`}>{tx(d.district.name, locale)}</Link>
                {none ? (
                  <span className={styles.none}>{t("noActivity")}</span>
                ) : (
                  <span className={styles.bar} aria-hidden="true">
                    <i
                      className={cx(d.activities.estimate && styles.est)}
                      style={{ width: `${Math.max(4, (value(d) / max) * 100)}%` }}
                    />
                  </span>
                )}
              </th>
              <td className={styles.numCol}>{none ? "—" : <FigureValue value={v} inline />}</td>
              <td className={cx(styles.numCol, styles.served)}>
                <FigureValue value={d.peopleServed.value} inline />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
