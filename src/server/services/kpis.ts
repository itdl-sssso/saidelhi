// Runtime KPI definitions: the constants in domain/kpi.ts are the seed, rows in
// `kpi_definition` hold admin edits (label, formula, flags, note, icon) over them.
import type { KpiDefinition, SevaType } from "@/contract";
import { ACTIVITIES, KPI_DEFS, LABELS, PEOPLE_SERVED } from "../domain/kpi";
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

/** Home tiles shown before admins touch the controls (spec 01), in display order. */
export const DEFAULT_HOME: readonly string[] = [ACTIVITIES, PEOPLE_SERVED, "blood.units", "eye.spectacles"];

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
    homeTile: DEFAULT_HOME.includes(d.key),
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

/** Synthetic tiles (computed from events) that admins can also hide / pin. */
export const SYNTHETIC_KPIS: readonly { key: string; label: { en: string; hi: string | null }; icon: string }[] = [
  { key: ACTIVITIES, label: LABELS.activities, icon: "activity" },
  { key: PEOPLE_SERVED, label: LABELS.peopleServed, icon: "users" },
  { key: "active", label: LABELS.active, icon: "map-pin" },
];

export interface KpiVisibility {
  /** KPI keys an admin switched off on the public Impact page. */
  hidden: Set<string>;
  /** Home tile keys in display order. */
  home: string[];
}

/** Public visibility derived from override rows only (so untouched KPIs behave as before). */
export async function loadKpiVisibility(repo: DataRepo): Promise<KpiVisibility> {
  const rows = new Map((await repo.m6.docList<KpiOverride>("kpi_definition")).map((r) => [r.id, r.data]));
  const hidden = new Set<string>();
  for (const [k, o] of rows) if (o.publicImpact === false) hidden.add(k);
  const keys = [...DEFAULT_HOME, ...SYNTHETIC_KPIS.map((x) => x.key), ...KPI_DEFS.map((d) => d.key)];
  const seen = new Set<string>();
  const home = keys.filter((k) => {
    if (seen.has(k)) return false;
    seen.add(k);
    const o = rows.get(k);
    return o?.homeTile !== undefined ? o.homeTile : DEFAULT_HOME.includes(k);
  });
  return { hidden, home };
}
