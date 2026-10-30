import { FeatureFlags, I18nText as I18nTextSchema, type I18nText, LINK_DEFAULTS, type LinkDefaults } from "@/contract";
import { loadKpiVisibility } from "./kpis";
import type { DataRepo } from "../repo/types";
import { LinkDefaults as LinkDefaultsSchema } from "@/contract";
import { OrgIndex } from "./org-index";

export async function loadOrg(repo: DataRepo): Promise<OrgIndex> {
  const [units, sevaTypes] = await Promise.all([repo.orgUnits(), repo.sevaTypes()]);
  return new OrgIndex(units, sevaTypes);
}

// discourses and thought_official: on in `next dev` for local work, off everywhere else until the Trust grants permission.
export const DEFAULT_FLAGS: FeatureFlags = { discourses: process.env.NODE_ENV === "development", offline_mode: false, ai_extraction: false, thought_official: process.env.NODE_ENV === "development" };

export interface PublicSettings {
  flags: FeatureFlags;
  showEstimates: boolean;
  /** KPI keys hidden from the public Impact page. */
  hiddenKpis: Set<string>;
  /** Home tile KPI keys, display order. */
  homeTiles: string[];
  estimateTooltip: I18nText | null;
}

export async function loadSettings(repo: DataRepo): Promise<PublicSettings> {
  const s = await repo.settings(["flags", "impact"]);
  const flags = FeatureFlags.partial().safeParse(s.get("flags"));
  const impact = s.get("impact");
  const showEstimates =
    typeof impact === "object" && impact !== null && "showEstimates" in impact ? impact.showEstimates !== false : true;
  const vis = await loadKpiVisibility(repo);
  const tip = typeof impact === "object" && impact !== null && "estimateTooltip" in impact ? I18nTextSchema.safeParse(impact.estimateTooltip) : null;
  return {
    flags: { ...DEFAULT_FLAGS, ...(flags.success ? flags.data : {}) },
    showEstimates,
    hiddenKpis: vis.hidden,
    homeTiles: vis.home,
    estimateTooltip: tip?.success ? tip.data : null,
  };
}

/** Link/OTP defaults from the `links` setting, falling back to LINK_DEFAULTS per field. */
export async function loadLinkDefaults(repo: DataRepo): Promise<LinkDefaults> {
  const parsed = LinkDefaultsSchema.partial().safeParse((await repo.settings(["links"])).get("links"));
  return { ...LINK_DEFAULTS, ...(parsed.success ? parsed.data : {}) };
}

export const pageOffset = (page: number, pageSize: number) => (page - 1) * pageSize;
