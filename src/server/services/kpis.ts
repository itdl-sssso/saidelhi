// Runtime KPI definitions: the constants in domain/kpi.ts are the seed, rows in
// `kpi_definition` hold admin edits (label, formula, flags, note, icon) over them.
import type { KpiDefinition, SevaType } from "@/contract";
import { KPI_DEFS } from "../domain/kpi";
import type { DataRepo } from "../repo/types";

/** What an admin may change; absent keys fall back to the seed. */
export interface KpiOverride {
  label?: { en: string; hi: string | null };
  formula?: { en: string; hi: string | null };
  publicImpact?: boolean;
  homeTile?: boolean;
  note?: { en: string; hi: string | null } | null;
  icon?: string;
}

const ICONS: Record<string, string> = { eye: "eye", blood: "droplet", medical: "stethoscope", narayan_seva: "utensils", bal_vikas: "book-open" };

const isBreakdown = (key: string) => key.includes("_by_") || key.startsWith("people.");

/** Seed values for one key (version 1). */
export function seedKpi(key: string): KpiDefinition | null {
  const d = KPI_DEFS.find((x) => x.key === key);
  if (!d) return null;
  return {
    key: d.key,
    label: d.label,
    sevaType: d.sevaType,
    how: "sum",
    formula: {
      en: `Sum of "${d.label.en}" on approved reports`,
      hi: d.label.hi ? `स्वीकृत रिपोर्टों में "${d.label.hi}" का योग` : null,
    },
    publicImpact: !isBreakdown(d.key),
    homeTile: false,
    suppress: d.suppress,
    served: d.served,
    note: null,
    icon: d.sevaType ? (ICONS[d.sevaType] ?? "activity") : d.key === "volunteers" ? "users" : "clock",
    version: 1,
  };
}

export function mergeKpi(seed: KpiDefinition, o: KpiOverride | undefined, version: number): KpiDefinition {
  return {
    ...seed,
    ...(o?.label ? { label: o.label } : {}),
    ...(o?.formula ? { formula: o.formula } : {}),
    ...(o?.publicImpact !== undefined ? { publicImpact: o.publicImpact } : {}),
    ...(o?.homeTile !== undefined ? { homeTile: o.homeTile } : {}),
    ...(o && "note" in o ? { note: o.note ?? null } : {}),
    ...(o?.icon ? { icon: o.icon } : {}),
    version,
  };
}

/** Every KPI definition (seed + overrides), in catalogue order. */
export async function loadKpiDefinitions(repo: DataRepo): Promise<KpiDefinition[]> {
  const rows = new Map((await repo.m6.docList<KpiOverride>("kpi_definition")).map((r) => [r.id, r]));
  const out: KpiDefinition[] = [];
  for (const d of KPI_DEFS) {
    const seed = seedKpi(d.key);
    if (!seed) continue;
    const r = rows.get(d.key);
    out.push(mergeKpi(seed, r?.data, r?.version ?? 1));
  }
  return out;
}

export type KpiSevaType = SevaType | null;
