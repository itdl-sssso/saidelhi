// Settings (spec 49): flags, link defaults, escalation, seva types, KPI definitions
// and UI-string overrides. Every change is audited; settings JSON is versioned via
// the `settings_meta` row (409 when a stale form is saved).
import {
  ESCALATION_DEFAULTS,
  type KpiDefinition,
  type KpiDefinitionPatch,
  type Locale,
  type Paged,
  type SettingsPatch,
  type SettingsPayload,
  type SevaTypeAdmin,
  type SevaTypeCreate,
  type SevaTypePatch,
  type UiString,
  type UiStringPatch,
  type UiStringsQuery,
} from "@/contract";
import { auditRec, diff } from "../../audit";
import { type Actor, assertCan } from "../../auth/rbac";
import { ApiError } from "../../http/errors";
import { type Flat, placeholders, samePlaceholders, shippedMessages } from "../../i18n/messages";
import type { SevaTypeRec } from "../../repo/types";
import { DEFAULT_FLAGS, loadLinkDefaults, loadSettings } from "../shared";
import { loadKpiDefinitions, type KpiOverride, mergeKpi, seedKpi } from "../kpis";
import { escalationSettings, type PortalCtx } from "./shared";

export interface SettingsService {
  get(actor: Actor): Promise<SettingsPayload>;
  patch(actor: Actor, body: SettingsPatch): Promise<SettingsPayload>;
  sevaTypes: {
    list(actor: Actor): Promise<SevaTypeAdmin[]>;
    create(actor: Actor, body: SevaTypeCreate): Promise<SevaTypeAdmin>;
    patch(actor: Actor, code: string, body: SevaTypePatch): Promise<SevaTypeAdmin>;
  };
  kpis: {
    list(actor: Actor): Promise<KpiDefinition[]>;
    patch(actor: Actor, key: string, body: KpiDefinitionPatch): Promise<KpiDefinition>;
  };
  strings: {
    list(actor: Actor, q: UiStringsQuery): Promise<Paged<UiString>>;
    patch(actor: Actor, body: UiStringPatch): Promise<UiString>;
  };
  /** Dotted key → text for one language (ui_string rows). No actor: used by the i18n request config. */
  overrides(locale: Locale): Promise<Flat>;
}

const conflict = () => new ApiError("CONFLICT");

export function createSettingsService(ctx: PortalCtx): SettingsService {
  const { repo } = ctx;

  async function metaVersion(): Promise<number> {
    const v = (await repo.settings(["settings_meta"])).get("settings_meta");
    return typeof v === "object" && v !== null && "version" in v && typeof v.version === "number" ? v.version : 1;
  }

  async function payload(): Promise<SettingsPayload> {
    const [s, links, esc, version] = await Promise.all([loadSettings(repo), loadLinkDefaults(repo), escalationSettings(repo), metaVersion()]);
    return {
      flags: s.flags,
      links,
      escalation: { approvalDays: esc.approvalDays },
      analytics: { provider: "none", enabled: false, lastEventAt: null },
      version,
    };
  }

  async function templateInfo(templateId: string | null | undefined) {
    if (!templateId) return null;
    const t = (await repo.links.templates()).find((x) => x.id === templateId);
    if (!t) return null;
    const v = await repo.links.publishedVersion(t.id);
    return { id: t.id, title: { en: t.titleEn, hi: t.titleHi }, version: v?.version ?? null };
  }

  async function toSevaAdmin(s: SevaTypeRec): Promise<SevaTypeAdmin> {
    return {
      code: s.code,
      label: { en: s.labelEn, hi: s.labelHi },
      icon: s.icon,
      wing: s.wing,
      active: s.active,
      sortOrder: s.sortOrder,
      template: await templateInfo(s.templateId),
      version: s.version ?? 1,
    };
  }

  async function overrideRows(locale?: Locale) {
    return repo.m6.docList<{ value: string }>("ui_string", locale ? { k1: locale, order: "asc" } : { order: "asc" });
  }

  function effective(overrides: { id: string; data: { value: string } }[]) {
    const base = shippedMessages();
    const en: Flat = { ...base.en };
    const hi: Flat = { ...base.hi };
    const over = new Set<string>();
    for (const r of overrides) {
      const [loc, ...rest] = r.id.split(":");
      const key = rest.join(":");
      (loc === "hi" ? hi : en)[key] = r.data.value;
      over.add(key);
    }
    return { en, hi, over };
  }

  const toUi = (key: string, en: Flat, hi: Flat, over: Set<string>): UiString => ({
    key,
    en: en[key] ?? "",
    hi: hi[key]?.trim() ? hi[key] : null,
    overridden: over.has(key),
  });

  return {
    async get(actor) {
      assertCan(actor, "settings.manage");
      return payload();
    },

    async patch(actor, body) {
      assertCan(actor, "settings.manage");
      if (body.version !== (await metaVersion())) throw conflict();
      const [cur, esc] = await Promise.all([payload(), repo.settings(["flags", "links", "escalation"])]);
      const audit = [];
      if (body.flags) {
        const flags = { ...DEFAULT_FLAGS, ...cur.flags, ...body.flags };
        audit.push(auditRec(actor, { action: "settings.flags", entity: "setting", entityId: "flags", data: diff(cur.flags, flags) }));
        await repo.m6.setSetting("flags", flags, actor.userId);
      }
      if (body.links) {
        const links = { ...cur.links, ...body.links };
        audit.push(auditRec(actor, { action: "settings.links", entity: "setting", entityId: "links", data: diff(cur.links, links) }));
        await repo.m6.setSetting("links", links, actor.userId);
      }
      if (body.escalation) {
        const prev = (esc.get("escalation") ?? {}) as Record<string, unknown>;
        const next = { ...ESCALATION_DEFAULTS, ...prev, ...body.escalation };
        audit.push(auditRec(actor, { action: "settings.escalation", entity: "setting", entityId: "escalation", data: diff(cur.escalation, body.escalation) }));
        await repo.m6.setSetting("escalation", next, actor.userId);
      }
      await repo.m6.setSetting("settings_meta", { version: body.version + 1 }, actor.userId, audit);
      if (body.flags) ctx.deps.revalidate(["discourses"]);
      return payload();
    },

    sevaTypes: {
      async list(actor) {
        assertCan(actor, "settings.manage");
        const types = [...(await repo.sevaTypes())].sort((a, b) => a.sortOrder - b.sortOrder);
        return Promise.all(types.map(toSevaAdmin));
      },

      async create(actor, body) {
        assertCan(actor, "settings.manage");
        const max = (await repo.sevaTypes()).reduce((m, s) => Math.max(m, s.sortOrder), 0);
        const rec: SevaTypeRec = {
          code: body.code,
          labelEn: body.label.en,
          labelHi: body.label.hi ?? null,
          icon: body.icon,
          wing: body.wing,
          sortOrder: max + 1,
          active: true,
          templateId: null,
          version: 1,
        };
        const res = await repo.m6.sevaTypeInsert(rec, [auditRec(actor, { action: "seva_type.create", entity: "seva_type", entityId: body.code, data: { label: body.label.en } })]);
        if (res === "duplicate") throw new ApiError("CONFLICT", { message: "This seva type already exists." });
        return toSevaAdmin(rec);
      },

      async patch(actor, code, body) {
        assertCan(actor, "settings.manage");
        const cur = (await repo.sevaTypes()).find((s) => s.code === code);
        if (!cur) throw new ApiError("NOT_FOUND");
        const { version, label, templateId, ...rest } = body;
        const patch: Partial<Omit<SevaTypeRec, "code">> = { ...rest };
        if (label) {
          patch.labelEn = label.en;
          patch.labelHi = label.hi;
        }
        if (templateId !== undefined) {
          if (templateId !== null) {
            const t = (await repo.links.templates()).find((x) => x.id === templateId);
            const published = t ? await repo.links.publishedVersion(t.id) : null;
            if (!t || t.sevaType !== code || !published) {
              throw new ApiError("VALIDATION_FAILED", { fields: { templateId: "Choose a published form for this seva type." } });
            }
          }
          patch.templateId = templateId;
        }
        const before = { label: cur.labelEn, icon: cur.icon, wing: cur.wing, active: cur.active, sortOrder: cur.sortOrder, templateId: cur.templateId ?? null };
        const res = await repo.m6.sevaTypeUpdate(code, patch, version, [
          auditRec(actor, { action: "seva_type.update", entity: "seva_type", entityId: code, data: diff(before, { ...before, ...rest, ...(label ? { label: label.en } : {}), ...(templateId !== undefined ? { templateId } : {}) }) }),
        ]);
        if (res === "conflict") throw conflict();
        const next = (await repo.sevaTypes()).find((s) => s.code === code);
        if (!next) throw new ApiError("NOT_FOUND");
        return toSevaAdmin(next);
      },
    },

    kpis: {
      async list(actor) {
        assertCan(actor, "settings.manage");
        return loadKpiDefinitions(repo);
      },

      async patch(actor, key, body) {
        assertCan(actor, "settings.manage");
        const seed = seedKpi(key);
        if (!seed) throw new ApiError("NOT_FOUND");
        const row = await repo.m6.docGet<KpiOverride>("kpi_definition", key);
        const curVersion = row?.version ?? 1;
        if (body.version !== curVersion) throw conflict();
        const changes = { ...body } as Partial<KpiDefinitionPatch>;
        delete changes.version;
        const data: KpiOverride = { ...(row?.data ?? {}), ...changes };
        const before = mergeKpi(seed, row?.data, curVersion);
        const audit = [auditRec(actor, { action: "kpi.update", entity: "kpi_definition", entityId: key, data: diff(before, { ...before, ...changes } as KpiDefinition) })];
        if (!row) {
          await repo.m6.docInsert("kpi_definition", { id: key, data: {} });
          await repo.m6.docUpdate("kpi_definition", { id: key, data }, 1, audit);
        } else {
          const res = await repo.m6.docUpdate("kpi_definition", { id: key, data }, curVersion, audit);
          if (!res.ok) throw conflict();
        }
        const next = await repo.m6.docGet<KpiOverride>("kpi_definition", key);
        return mergeKpi(seed, next?.data, next?.version ?? 1);
      },
    },

    strings: {
      async list(actor, q) {
        assertCan(actor, "settings.manage");
        const { en, hi, over } = effective(await overrideRows());
        const needle = q.q?.toLowerCase();
        const rows = Object.keys(shippedMessages().en)
          .filter((k) => !q.ns || k.split(".")[0] === q.ns)
          .map((k) => toUi(k, en, hi, over))
          .filter((r) => !q.missing || r.hi === null)
          .filter((r) => !needle || r.key.toLowerCase().includes(needle) || r.en.toLowerCase().includes(needle) || (r.hi ?? "").toLowerCase().includes(needle));
        return { data: rows.slice((q.page - 1) * q.pageSize, q.page * q.pageSize), meta: { page: q.page, pageSize: q.pageSize, total: rows.length } };
      },

      async patch(actor, body) {
        assertCan(actor, "settings.manage");
        const base = shippedMessages();
        const ref = base.en[body.key];
        if (ref === undefined) throw new ApiError("NOT_FOUND");
        const fields: Record<string, string> = {};
        for (const loc of ["en", "hi"] as const) {
          const v = body[loc];
          if (typeof v === "string" && v.trim() && !samePlaceholders(ref, v)) {
            fields[loc] = `Keep the same placeholders as the English text: ${placeholders(ref).map((p) => `{${p}}`).join(" ") || "(none)"}.`;
          }
        }
        if (Object.keys(fields).length) throw new ApiError("VALIDATION_FAILED", { fields });
        const audit = [auditRec(actor, { action: "ui_string.update", entity: "ui_string", entityId: body.key, data: { en: body.en !== undefined, hi: body.hi !== undefined } })];
        for (const loc of ["en", "hi"] as const) {
          const v = body[loc];
          if (v === undefined) continue;
          const id = `${loc}:${body.key}`;
          // null or a blank value resets to the shipped text.
          if (v === null || !v.trim()) await repo.m6.docDelete("ui_string", id);
          else await repo.m6.docUpsert("ui_string", { id, k1: loc, data: { value: v.trim() } });
        }
        for (const a of audit) await repo.portal.insertAudit(a);
        const { en, hi, over } = effective(await overrideRows());
        return toUi(body.key, en, hi, over);
      },
    },

    async overrides(locale) {
      const out: Flat = {};
      for (const r of await overrideRows(locale)) out[r.id.slice(locale.length + 1)] = r.data.value;
      return out;
    },
  };
}
