import { z } from "zod";
import { Article, Thought, WingCard } from "./content";
import { ImpactPeriod, SevaType } from "./enums";
import { EventPublic } from "./events";
import { CentreListItem, OrgUnit } from "./org";
import { Figure, I18nText, ISODate, ISOMonth, UnitRef } from "./primitives";

export const PeriodInfo = z.object({
  /** null for 'all time'. */
  from: ISODate.nullable(),
  to: ISODate,
  label: I18nText,
});
export type PeriodInfo = z.infer<typeof PeriodInfo>;

export const KpiTile = z.object({
  key: z.string(),
  label: I18nText,
  figure: Figure,
  period: PeriodInfo,
  sparkline: z.array(z.number()).optional(),
  deltaPct: z.number().nullable().optional(),
  note: I18nText.optional(),
});
export type KpiTile = z.infer<typeof KpiTile>;

export const LabelledFigure = z.object({ key: z.string(), label: I18nText, figure: Figure });
export type LabelledFigure = z.infer<typeof LabelledFigure>;

export const SevaTypeImpact = z.object({
  sevaType: SevaType,
  label: I18nText,
  icon: z.string(),
  figures: z.array(LabelledFigure),
  href: z.string(),
});
export type SevaTypeImpact = z.infer<typeof SevaTypeImpact>;

export const DistrictImpact = z.object({
  district: UnitRef,
  activities: Figure,
  peopleServed: Figure,
});
export type DistrictImpact = z.infer<typeof DistrictImpact>;

export const TrendPoint = z.object({ month: ISOMonth, figure: Figure });
export type TrendPoint = z.infer<typeof TrendPoint>;

/** GET /impact */
export const ImpactPayload = z.object({
  period: PeriodInfo.extend({ key: ImpactPeriod }),
  district: UnitRef.nullable(),
  tiles: z.array(KpiTile),
  bySevaType: z.array(SevaTypeImpact),
  byDistrict: z.array(DistrictImpact),
  trend: z.array(TrendPoint),
  recent: z.array(EventPublic),
  methodNote: I18nText,
  /** Tooltip for "Estimate" badges. */
  estimateNote: I18nText,
});
export type ImpactPayload = z.infer<typeof ImpactPayload>;

/** GET /home */
export const HomePayload = z.object({
  thought: Thought.nullable(),
  upcoming: z.array(EventPublic).max(6),
  /** null → hide tiles, show Programs teaser (spec 01). */
  kpis: z.array(KpiTile).length(4).nullable(),
  articles: z.array(Article).max(3),
  centenary: z.array(Article),
  wings: z.array(WingCard),
});
export type HomePayload = z.infer<typeof HomePayload>;

/**
 * v0.6: age / gender split (spec 13; district level and above only). Each bar obeys public
 * small-number suppression (<5 → `{lt5:true}`); `value:null` = not reported.
 */
export const DemographicSplit = z.object({
  key: z.enum(["age", "gender"]),
  label: I18nText,
  bars: z.array(z.object({ key: z.string(), label: I18nText, figure: Figure })),
});
export type DemographicSplit = z.infer<typeof DemographicSplit>;

/** GET /districts/:slug */
export const DistrictPayload = z.object({
  district: OrgUnit,
  samithiCount: z.number().int().nonnegative(),
  intro: I18nText.nullable(),
  /** null when the district has no approved data this year. */
  kpis: z.array(KpiTile).nullable(),
  bySevaType: z.array(SevaTypeImpact),
  /** v0.6: this year's demographic splits; [] when none reported. */
  demographics: z.array(DemographicSplit),
  upcoming: z.array(EventPublic),
  centres: z.array(CentreListItem),
});
export type DistrictPayload = z.infer<typeof DistrictPayload>;

/** GET /centres/:slug */
export const CentreDetail = CentreListItem.extend({
  upcoming: z.array(EventPublic),
  /** Samithi-level totals for this year; null → "This centre's seva will appear here." */
  thisYear: z.array(KpiTile).nullable(),
  past: z.array(EventPublic),
});
export type CentreDetail = z.infer<typeof CentreDetail>;
