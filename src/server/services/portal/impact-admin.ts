// Impact controls (spec 40): which KPIs the public Impact page and Home show, the
// estimates switch + tooltip, and pre-platform estimates CRUD. Public services read the same rows.
import type { ImpactAdminPayload, ImpactEstimateInput, ImpactEstimatePatch, ImpactEstimateRow, ImpactEstimatesQuery, ImpactSettingsPatch, Paged } from "@/contract";
import { auditRec } from "../../audit";
import { type Actor, assertCan } from "../../auth/rbac";
import { newId } from "../../db/columns";
import { istYear } from "../../domain/time";
import { KPI_DEFS, NOTES } from "../../domain/kpi";
import { ApiError } from "../../http/errors";
import type { EstimateRec } from "../../repo/types";
import { type KpiOverride, loadKpiDefinitions, SYNTHETIC_KPIS } from "../kpis";
import { activeTile, figureFor, headlineTiles, loadImpactData, periodWindow, tile } from "../impact-calc";
import { DEFAULT_HOME } from "../kpis";
import { loadSettings, pageOffset } from "../shared";
import { loadOrg, type PortalCtx } from "./shared";

export interface ImpactAdminService {
  get(actor: Actor): Promise<ImpactAdminPayload>;
  patch(actor: Actor, body: ImpactSettingsPatch): Promise<ImpactAdminPayload>;
  estimates: {
    list(actor: Actor, q: ImpactEstimatesQuery): Promise<Paged<ImpactEstimateRow>>;
    create(actor: Actor, body: ImpactEstimateInput): Promise<ImpactEstimateRow>;
    patch(actor: Actor, id: string, body: ImpactEstimatePatch): Promise<ImpactEstimateRow>;
    remove(actor: Actor, id: string): Promise<void>;
  };
}

interface ImpactSetting {
  showEstimates?: boolean;
  estimateTooltip?: { en: string; hi: string | null };
  version?: number;
}

const DEFAULT_TOOLTIP = NOTES.estimate;

export function createImpactAdminService(ctx: PortalCtx): ImpactAdminService {
  const { repo, deps } = ctx;
  const MANAGE = "impact.manage" as const;

  async function readSetting(): Promise<ImpactSetting> {
    const v = (await repo.settings(["impact"])).get("impact");
    return typeof v === "object" && v !== null ? (v as ImpactSetting) : {};
  }

  async function payload(): Promise<ImpactAdminPayload> {
    const now = deps.now();
    const [org, defs, set, settings] = await Promise.all([loadOrg(repo), loadKpiDefinitions(repo), readSetting(), loadSettings(repo)]);
    const win = periodWindow("all", now);
    const data = await loadImpactData(repo, org, {}, win, settings.showEstimates);
    const overrides = new Map((await repo.m6.docList<KpiOverride>("kpi_definition")).map((r) => [r.id, r.data]));
    const synth = SYNTHETIC_KPIS.map((s) => {
      const o = overrides.get(s.key);
      return {
        key: s.key,
        label: o?.label ?? s.label,
        icon: s.icon,
        publicImpact: o?.publicImpact ?? true,
        homeTile: o?.homeTile ?? DEFAULT_HOME.includes(s.key),
        note: o && "note" in o ? (o.note ?? null) : null,
        current: s.key === "active" ? activeTile(data, win.info).figure : figureFor(data, s.key),
      };
    });
    const kpis = [
      ...synth,
      ...defs.map((d) => ({
        key: d.key,
        label: d.label,
        icon: d.icon,
        publicImpact: d.publicImpact,
        homeTile: d.homeTile,
        note: d.note,
        current: figureFor(data, d.key),
      })),
    ];
    const hidden = new Set(kpis.filter((k) => !k.publicImpact).map((k) => k.key));
    const homeKeys = kpis.filter((k) => k.homeTile).map((k) => k.key);
    const preview = [
      ...headlineTiles(data, win.info, hidden),
      ...homeKeys.filter((k) => !["activities", "people_served", "volunteer_hours", "active"].includes(k) && !hidden.has(k)).map((k) => tile(data, k, win.info)),
    ];
    return {
      kpis,
      showEstimates: set.showEstimates !== false,
      estimateTooltip: set.estimateTooltip ?? DEFAULT_TOOLTIP,
      preview,
      version: set.version ?? 1,
    };
  }

  async function toRow(e: EstimateRec, org: Awaited<ReturnType<typeof loadOrg>>): Promise<ImpactEstimateRow> {
    const defs = KPI_DEFS.find((d) => d.key === e.kpiKey);
    const by = e.createdBy ? ((await repo.portal.userById(e.createdBy))?.name ?? "") : "";
    const unit = org.ref(org.districtIdOf(e.orgUnitId) ?? e.orgUnitId);
    return {
      id: e.id,
      district: unit,
      year: Number(e.month.slice(0, 4)),
      month: e.period === "year" ? null : e.month.slice(0, 7),
      sevaType: e.sevaType,
      kpiKey: e.kpiKey,
      kpiLabel: defs?.label ?? { en: e.kpiKey === "activities" ? "Activities" : e.kpiKey, hi: null },
      value: e.value,
      source: e.note ?? "",
      enteredBy: by,
      visible: e.visible,
      createdAt: (e.createdAt ?? new Date(0)).toISOString(),
    };
  }

  const knownKpi = (k: string) => k === "activities" || k === "people_served" || KPI_DEFS.some((d) => d.key === k);

  async function validate(year: number, kpiKey: string, districtId: string, org: Awaited<ReturnType<typeof loadOrg>>) {
    const fields: Record<string, string> = {};
    if (year > istYear(deps.now()) - 1) fields.year = "Estimates are only for years before the platform.";
    if (!knownKpi(kpiKey)) fields.kpiKey = "Choose a figure from the list.";
    if (!org.district(districtId) && !org.districts().some((d) => d.id === districtId)) fields.districtId = "Choose a district.";
    if (Object.keys(fields).length) throw new ApiError("VALIDATION_FAILED", { fields });
  }

  const monthOf = (year: number, month: string | null | undefined) => (month ? `${month}-01` : `${year}-01-01`);

  return {
    get: async (actor) => {
      assertCan(actor, MANAGE);
      return payload();
    },

    async patch(actor, body) {
      assertCan(actor, MANAGE);
      const cur = await readSetting();
      if (body.version !== (cur.version ?? 1)) throw new ApiError("CONFLICT");
      const next = (await payload()).kpis.map((k) => ({ ...k }));
      const changes = new Map((body.kpis ?? []).map((k) => [k.key, k]));
      for (const k of changes.keys()) if (!next.some((n) => n.key === k)) throw new ApiError("VALIDATION_FAILED", { fields: { kpis: `Unknown figure ${k}.` } });
      for (const n of next) {
        const c = changes.get(n.key);
        if (c) {
          n.publicImpact = c.publicImpact;
          n.homeTile = c.homeTile;
        }
      }
      if (next.filter((n) => n.homeTile).length > 4) throw new ApiError("VALIDATION_FAILED", { fields: { kpis: "Pick at most 4 tiles for the Home page." } });
      for (const [key, c] of changes) {
        const row = await repo.m6.docGet<KpiOverride>("kpi_definition", key);
        const data: KpiOverride = { ...(row?.data ?? {}), publicImpact: c.publicImpact, homeTile: c.homeTile };
        if (c.note !== undefined) data.note = c.note ? { en: c.note.en, hi: c.note.hi ?? null } : null;
        if (row) await repo.m6.docUpdate("kpi_definition", { id: key, data }, row.version);
        else await repo.m6.docInsert("kpi_definition", { id: key, data });
      }
      const set: ImpactSetting = {
        ...cur,
        ...(body.showEstimates !== undefined ? { showEstimates: body.showEstimates } : {}),
        ...(body.estimateTooltip ? { estimateTooltip: { en: body.estimateTooltip.en, hi: body.estimateTooltip.hi ?? null } } : {}),
        version: (cur.version ?? 1) + 1,
      };
      await repo.m6.setSetting("impact", set, actor.userId, [
        auditRec(actor, {
          action: "impact.update",
          entity: "setting",
          entityId: "impact",
          data: { kpis: [...changes.keys()], showEstimates: set.showEstimates ?? true, homeTiles: next.filter((n) => n.homeTile).map((n) => n.key) },
        }),
      ]);
      return payload();
    },

    estimates: {
      async list(actor, q) {
        assertCan(actor, MANAGE);
        const org = await loadOrg(repo);
        let rows = await repo.m6.estimatesAll();
        if (q.year) rows = rows.filter((e) => e.month.startsWith(String(q.year)));
        if (q.district) rows = rows.filter((e) => org.districtIdOf(e.orgUnitId) === q.district || e.orgUnitId === q.district);
        rows.sort((a, b) => b.month.localeCompare(a.month) || a.id.localeCompare(b.id));
        const page = rows.slice(pageOffset(q.page, q.pageSize), pageOffset(q.page, q.pageSize) + q.pageSize);
        return { data: await Promise.all(page.map((e) => toRow(e, org))), meta: { page: q.page, pageSize: q.pageSize, total: rows.length } };
      },

      async create(actor, body) {
        assertCan(actor, MANAGE);
        const org = await loadOrg(repo);
        await validate(body.year, body.kpiKey, body.districtId, org);
        const rec: EstimateRec = {
          id: newId(),
          orgUnitId: body.districtId,
          sevaType: body.sevaType ?? null,
          kpiKey: body.kpiKey,
          month: monthOf(body.year, body.month),
          period: body.month ? "month" : "year",
          value: body.value,
          note: body.source,
          visible: body.visible ?? true,
          createdBy: actor.userId,
          createdAt: deps.now(),
        };
        await repo.m6.estimateInsert(rec, [auditRec(actor, { action: "impact.estimate.create", entity: "impact_estimate", entityId: rec.id, data: { kpi: rec.kpiKey, month: rec.month, value: rec.value } })]);
        return toRow(rec, org);
      },

      async patch(actor, id, body) {
        assertCan(actor, MANAGE);
        const org = await loadOrg(repo);
        const cur = (await repo.m6.estimatesAll()).find((e) => e.id === id);
        if (!cur) throw new ApiError("NOT_FOUND");
        const year = body.year ?? Number(cur.month.slice(0, 4));
        const districtId = body.districtId ?? cur.orgUnitId;
        const kpiKey = body.kpiKey ?? cur.kpiKey;
        await validate(year, kpiKey, districtId, org);
        const month = "month" in body ? body.month : cur.period === "year" ? null : cur.month.slice(0, 7);
        const patch: Partial<Omit<EstimateRec, "id">> = {
          orgUnitId: districtId,
          kpiKey,
          month: monthOf(year, month),
          period: month ? "month" : "year",
          ...(body.sevaType !== undefined ? { sevaType: body.sevaType } : {}),
          ...(body.value !== undefined ? { value: body.value } : {}),
          ...(body.source !== undefined ? { note: body.source } : {}),
          ...(body.visible !== undefined ? { visible: body.visible } : {}),
        };
        const ok = await repo.m6.estimateUpdate(id, patch, [auditRec(actor, { action: "impact.estimate.update", entity: "impact_estimate", entityId: id, data: { before: { value: cur.value, month: cur.month, visible: cur.visible }, after: { value: patch.value ?? cur.value, month: patch.month, visible: patch.visible ?? cur.visible } } })]);
        if (!ok) throw new ApiError("NOT_FOUND");
        const next = (await repo.m6.estimatesAll()).find((e) => e.id === id);
        if (!next) throw new ApiError("NOT_FOUND");
        return toRow(next, org);
      },

      async remove(actor, id) {
        assertCan(actor, MANAGE);
        const cur = (await repo.m6.estimatesAll()).find((e) => e.id === id);
        if (!cur) throw new ApiError("NOT_FOUND");
        await repo.m6.estimateDelete(id, [auditRec(actor, { action: "impact.estimate.delete", entity: "impact_estimate", entityId: id, data: { kpi: cur.kpiKey, month: cur.month, value: cur.value } })]);
      },
    },
  };
}
