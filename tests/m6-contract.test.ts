// Pure M6 contract helpers: builder checks, Excel columns, chat questions, endpoint builders, zod schemas.
import { describe, expect, it } from "vitest";
import {
  adminEndpoints,
  builderChecks,
  canPublish,
  chatQuestions,
  excelColumns,
  fieldCount,
  FormDraftPatch,
  missingHindi,
  SettingsPatch,
  UploadForm,
} from "@/contract";
import { bloodCampReport, eyeCampReport, volunteerSignup } from "@/server/forms/definitions";

describe("builder helpers on the shipped forms", () => {
  it("report forms pass every blocking check", () => {
    for (const def of [eyeCampReport, bloodCampReport]) {
      const checks = builderChecks(def, { purpose: "report" });
      expect(checks.filter((c) => !c.ok && c.level === "error"), def.title.en).toEqual([]);
      expect(canPublish(checks)).toBe(true);
    }
  });

  it("the sign-up form needs no core fields and keeps personal answers out of Excel", () => {
    const checks = builderChecks(volunteerSignup, { purpose: "public" });
    expect(checks.find((c) => c.key === "core_fields")?.ok).toBe(true);
    expect(excelColumns(volunteerSignup)).toEqual([]);
  });

  it("flags missing Hindi, ID-number questions and duplicate KPI mappings", () => {
    const def = structuredClone(eyeCampReport);
    const f = def.sections[1].fields[0];
    f.label.hi = null;
    expect(missingHindi(def)).toContain(f.id);
    expect(canPublish(builderChecks(def))).toBe(false);

    const idq = structuredClone(eyeCampReport);
    idq.sections[1].fields.push({ ...idq.sections[1].fields[0], id: "aadhaar_no", label: { en: "Aadhaar number", hi: "आधार" }, kpi: null });
    expect(builderChecks(idq).find((c) => c.key === "no_id_numbers")?.fieldIds).toContain("aadhaar_no");

    const dupe = structuredClone(eyeCampReport);
    dupe.sections[1].fields.push({ ...dupe.sections[1].fields[0], id: "registered_copy" });
    expect(builderChecks(dupe).find((c) => c.key === "kpi_unique")?.ok).toBe(false);
  });

  it("Excel columns start with the samithi code and the locked fields, and counts match", () => {
    const cols = excelColumns(eyeCampReport);
    expect(cols[0]).toMatchObject({ header: "samithi_code", fieldId: "samithi", locked: true });
    expect(cols.map((c) => c.header)).toEqual(expect.arrayContaining(["date", "venue", "volunteers", "volunteer_hours", "registered"]));
    expect(fieldCount(eyeCampReport)).toBeGreaterThan(cols.length - 1);
  });

  it("chat questions honour show-if against the answers so far", () => {
    const empty = chatQuestions(eyeCampReport, {}).map((f) => f.id);
    const powers = chatQuestions(eyeCampReport, { spectacles_total: 12 }).map((f) => f.id);
    expect(powers.length).toBeGreaterThan(empty.length);
  });
});

describe("M6 endpoints and bodies", () => {
  it("builds paths with encoded segments and query strings", () => {
    expect(adminEndpoints.form("abc")).toBe("/api/v1/admin/forms/abc");
    expect(adminEndpoints.formVersion("abc", 3)).toBe("/api/v1/admin/forms/abc/versions/3");
    expect(adminEndpoints.uploads({ status: "loaded", page: 2 })).toBe("/api/v1/admin/uploads?status=loaded&page=2");
    expect(adminEndpoints.redirectDelete("/old path")).toBe("/api/v1/admin/redirects?from=%2Fold+path");
  });

  it("validates bodies", () => {
    expect(SettingsPatch.safeParse({ links: { reportLinkDays: 99 }, version: 1 }).success).toBe(false);
    expect(SettingsPatch.safeParse({ links: { reportLinkDays: 30 }, version: 1 }).success).toBe(true);
    expect(UploadForm.safeParse({ sevaType: "eye" }).success).toBe(true);
    expect(FormDraftPatch.safeParse({ definition: {}, version: null }).success).toBe(false);
  });
});
