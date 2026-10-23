// M6 frontend: pure helpers behind the form builder UI.
import { describe, expect, it } from "vitest";
import { builderChecks, canPublish } from "@/contract";
import { bloodCampReport, eyeCampReport } from "@/server/forms/definitions";
import { addField, checkText, newField, opsFor, parseRuleValue, removeField, renameField, reorderFields, ruleText, setPersonal, slugId, updateField } from "@/features/admin/forms/builder-model";

const ids = (def: typeof eyeCampReport) => def.sections.flatMap((s) => s.fields.map((f) => f.id));

describe("builder-model", () => {
  it("slugId makes unique snake ids", () => {
    expect(slugId("People screened", new Set())).toBe("people_screened");
    expect(slugId("People screened", new Set(["people_screened"]))).toBe("people_screened_2");
    expect(slugId("???", new Set())).toBe("field");
  });

  it("addField / removeField keep the rest and drop dangling rules", () => {
    const f = newField("number", new Set(ids(eyeCampReport)));
    const added = addField(eyeCampReport, "notes", f);
    expect(ids(added)).toContain(f.id);
    // `registered` is referenced by checks on other fields: removing it removes those checks, never leaves a dangling id.
    const removed = removeField(eyeCampReport, "registered");
    expect(ids(removed)).not.toContain("registered");
    const text = JSON.stringify(removed.sections);
    expect(text).not.toMatch(/"(left|right)":"[^"]*registered/);
    expect(text).not.toContain('"field":"registered"');
  });

  it("renameField updates showIf and check operands", () => {
    const renamed = renameField(eyeCampReport, "cataract_found", "cataract_seen");
    const text = JSON.stringify(renamed.sections);
    expect(text).toContain("cataract_seen");
    expect(text).not.toContain('"cataract_found"');
  });

  it("reorderFields moves within a section", () => {
    const sec = bloodCampReport.sections[0];
    const out = reorderFields(bloodCampReport, sec.id, 0, 2);
    expect(out.sections[0].fields[2].id).toBe(sec.fields[0].id);
  });

  it("setPersonal on a field adds a consent field when the section has none, and clears the KPI", () => {
    const f = newField("text", new Set(ids(bloodCampReport)));
    const def = addField(bloodCampReport, "notes", { ...f, label: { en: "Donor name", hi: "दाता का नाम" } });
    const next = setPersonal(def, f.id, true);
    const sec = next.sections.find((s) => s.id === "notes")!;
    expect(sec.fields.find((x) => x.id === f.id)?.personal).toBe(true);
    expect(sec.fields.some((x) => x.consent)).toBe(true);
    expect(builderChecks(next).find((c) => c.key === "personal_consent")?.ok).toBe(true);
  });

  it("publish is blocked until Hindi exists for every label", () => {
    const f = newField("number", new Set(ids(eyeCampReport)));
    const def = addField(eyeCampReport, "notes", { ...f, label: { en: "New count", hi: null } });
    expect(canPublish(builderChecks(def))).toBe(false);
    const done = updateField(def, f.id, { label: { en: "New count", hi: "नई गिनती" } });
    expect(builderChecks(done).find((c) => c.key === "hi_labels")?.ok).toBe(true);
  });

  it("rule labels read plainly", () => {
    const labelOf = (id: string) => (id === "a" ? "Spectacles given" : id);
    expect(ruleText({ field: "a", op: "gt", value: 0 }, labelOf)).toEqual({ field: "Spectacles given", op: ">", value: "0" });
    expect(checkText({ op: "lte", left: "a+b", right: 5, level: "error", message: { en: "", hi: null } }, labelOf)).toBe("Spectacles given + b ≤ 5");
  });

  it("parseRuleValue and opsFor follow the field kind", () => {
    expect(parseRuleValue("number", "gt", "3")).toBe(3);
    expect(parseRuleValue("yesno", "eq", "yes")).toBe(true);
    expect(parseRuleValue("select", "in", "a, b")).toEqual(["a", "b"]);
    expect(parseRuleValue("number", "filled", "")).toBeUndefined();
    expect(opsFor("yesno")).toEqual(["eq", "filled"]);
    expect(opsFor("number")).toContain("gte");
  });
});
