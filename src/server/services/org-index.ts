import type { I18nText, OrgUnit, SevaType, SevaTypeInfo, UnitRef } from "@/contract";
import type { OrgUnitRec, SevaTypeRec } from "../repo/types";

export const i18n = (en: string, hi: string | null | undefined): I18nText => ({ en, hi: hi ?? null });

/** In-memory index over the (small) org tree and seva types. */
export class OrgIndex {
  private readonly byId = new Map<string, OrgUnitRec>();
  private readonly bySlugKind = new Map<string, OrgUnitRec>();
  private readonly sevaByCode = new Map<SevaType, SevaTypeRec>();

  constructor(units: readonly OrgUnitRec[], sevaTypes: readonly SevaTypeRec[]) {
    for (const u of units) {
      this.byId.set(u.id, u);
      this.bySlugKind.set(`${u.kind}:${u.slug}`, u);
    }
    for (const s of sevaTypes) this.sevaByCode.set(s.code, s);
  }

  get(id: string): OrgUnitRec | undefined {
    return this.byId.get(id);
  }

  district(slug: string): OrgUnitRec | undefined {
    const u = this.bySlugKind.get(`district:${slug}`);
    return u?.active ? u : undefined;
  }

  samithi(slug: string): OrgUnitRec | undefined {
    const u = this.bySlugKind.get(`samithi:${slug}`);
    return u?.active ? u : undefined;
  }

  /** Active districts in display order. */
  districts(): OrgUnitRec[] {
    return [...this.byId.values()]
      .filter((u) => u.kind === "district" && u.active)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.nameEn.localeCompare(b.nameEn));
  }

  samithisOf(districtId: string): OrgUnitRec[] {
    return [...this.byId.values()].filter((u) => u.kind === "samithi" && u.active && u.parentId === districtId);
  }

  /** District id for a samithi id (or the id itself when it is a district). */
  districtIdOf(unitId: string): string | undefined {
    const u = this.byId.get(unitId);
    if (!u) return undefined;
    if (u.kind === "district") return u.id;
    if (u.kind === "samithi" && u.parentId) return u.parentId;
    return undefined;
  }

  ref(id: string): UnitRef {
    const u = this.byId.get(id);
    if (!u) return { id, slug: "", name: { en: "Unknown", hi: null } };
    return { id: u.id, slug: u.slug, name: i18n(u.nameEn, u.nameHi) };
  }

  toOrgUnit(u: OrgUnitRec): OrgUnit {
    return { id: u.id, code: u.code, kind: u.kind, name: i18n(u.nameEn, u.nameHi), slug: u.slug, parentId: u.parentId, active: u.active };
  }

  sevaType(code: SevaType): SevaTypeInfo {
    const s = this.sevaByCode.get(code);
    if (!s) return { code, label: { en: code, hi: null }, icon: "hand-heart", wing: "service" };
    return { code: s.code, label: i18n(s.labelEn, s.labelHi), icon: s.icon, wing: s.wing };
  }
}
