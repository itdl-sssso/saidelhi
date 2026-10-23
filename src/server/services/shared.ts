import { FeatureFlags, LINK_DEFAULTS, type LinkDefaults } from "@/contract";
import type { DataRepo } from "../repo/types";
import { LinkDefaults as LinkDefaultsSchema } from "@/contract";
import { OrgIndex } from "./org-index";

export async function loadOrg(repo: DataRepo): Promise<OrgIndex> {
  const [units, sevaTypes] = await Promise.all([repo.orgUnits(), repo.sevaTypes()]);
  return new OrgIndex(units, sevaTypes);
}

export const DEFAULT_FLAGS: FeatureFlags = { discourses: false, offline_mode: false, ai_extraction: false };

export interface PublicSettings {
  flags: FeatureFlags;
  showEstimates: boolean;
}

export async function loadSettings(repo: DataRepo): Promise<PublicSettings> {
  const s = await repo.settings(["flags", "impact"]);
  const flags = FeatureFlags.partial().safeParse(s.get("flags"));
  const impact = s.get("impact");
  const showEstimates =
    typeof impact === "object" && impact !== null && "showEstimates" in impact ? impact.showEstimates !== false : true;
  return { flags: { ...DEFAULT_FLAGS, ...(flags.success ? flags.data : {}) }, showEstimates };
}

/** Link/OTP defaults from the `links` setting, falling back to LINK_DEFAULTS per field. */
export async function loadLinkDefaults(repo: DataRepo): Promise<LinkDefaults> {
  const parsed = LinkDefaultsSchema.partial().safeParse((await repo.settings(["links"])).get("links"));
  return { ...LINK_DEFAULTS, ...(parsed.success ? parsed.data : {}) };
}

export const pageOffset = (page: number, pageSize: number) => (page - 1) * pageSize;
