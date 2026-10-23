import { describe, expect, it } from "vitest";
import { FormDefinition, issuesToFieldMap, kpiFactsFromAnswers, lintDefinition, splitPersonal, validateAnswers } from "@/contract";
import { bloodCampReport, eyeCampReport, TEMPLATE_SEEDS, volunteerSignup } from "@/server/forms/definitions";
import { kpiDef } from "@/server/domain/kpi";
import { EYE_ANSWERS } from "./support/forms";

const paths = (issues: { path: string }[]) => issues.map((i) => i.path);

describe("hand-written definitions", () => {
  it("are contract-valid, lint-clean and only map to known KPI keys", () => {
    for (const t of TEMPLATE_SEEDS) {
      FormDefinition.parse(t.definition);
      expect(lintDefinition(t.definition)).toEqual([]);
      for (const s of t.definition.sections) {
        for (const f of s.fields) {
          if (f.kpi) expect(kpiDef(f.kpi.split(":")[0]), f.kpi).toBeDefined();
          expect(f.label.hi, `${f.id} needs Hindi`).toMatch(/[ऀ-ॿ]|^\+\d/);
        }
      }
    }
  });

  it("eye camp has the spec 20 sections in order", () => {
    expect(eyeCampReport.sections.map((s) => s.id)).toEqual(["about", "people", "spectacles", "cataract", "attach", "followup", "notes"]);
    const about = eyeCampReport.sections[0].fields;
    expect(about.filter((f) => f.locked).map((f) => f.id)).toEqual(["samithi", "date", "venue", "volunteers", "volunteer_hours"]);
    expect(eyeCampReport.sections.find((s) => s.id === "followup")?.personalData).toBe(true);
  });

  it("lint catches dangling references and personal data without consent", () => {
    const broken: FormDefinition = {
      ...volunteerSignup,
      sections: [{ ...volunteerSignup.sections[0], fields: volunteerSignup.sections[0].fields.filter((f) => !f.consent) }],
    };
    expect(lintDefinition(broken).join()).toMatch(/consent/);
    const dangling: FormDefinition = {
      ...bloodCampReport,
      sections: [{ id: "x", title: { en: "x", hi: "x" }, personalData: false, fields: [{ ...bloodCampReport.sections[2].fields[0], id: "u2" }] }],
    };
    expect(lintDefinition(dangling).join()).toMatch(/unknown accepted/);
  });
});

describe("validation engine", () => {
  it("accepts the sample eye camp and coerces numeric strings", () => {
    const r = validateAnswers(eyeCampReport, { ...EYE_ANSWERS, registered: "115" });
    expect(r.errors).toEqual([]);
    expect(r.ok).toBe(true);
    expect(r.clean.registered).toBe(115);
  });

  it("spectacles: powers must add up to the total", () => {
    const r = validateAnswers(eyeCampReport, { ...EYE_ANSWERS, p_3_0: 6 });
    expect(r.ok).toBe(false);
    expect(paths(r.errors)).toEqual(["spectacles_total"]);
    expect(r.errors[0].message.hi).toMatch(/[ऀ-ॿ]/);
    // Total given but breakdown unknown (all blank) is fine: the check only applies once any power is entered.
    const blank = validateAnswers(eyeCampReport, { ...EYE_ANSWERS, p_1_0: null, p_1_5: null, p_2_0: null, p_2_5: null, p_3_0: null });
    expect(paths(blank.errors)).toEqual([]);
    const partial = validateAnswers(eyeCampReport, { ...EYE_ANSWERS, p_1_0: 5, p_1_5: null, p_2_0: null, p_2_5: null, p_3_0: null });
    expect(paths(partial.errors)).toEqual(["spectacles_total"]);
  });

  it("cataract: referred ≤ found; hidden when none found", () => {
    const r = validateAnswers(eyeCampReport, { ...EYE_ANSWERS, cataract_referred: 14 });
    expect(paths(r.errors)).toEqual(["cataract_referred"]);
    const none = validateAnswers(eyeCampReport, { ...EYE_ANSWERS, cataract_found: 0, cataract_referred: 14 });
    expect(none.ok).toBe(true);
    expect(none.clean).not.toHaveProperty("cataract_referred");
  });

  it("show-if strips hidden fields (no spectacles → no powers)", () => {
    const r = validateAnswers(eyeCampReport, { ...EYE_ANSWERS, spectacles_total: 0 });
    expect(r.ok).toBe(true);
    expect(r.clean).not.toHaveProperty("p_1_0");
  });

  it("warnings never block", () => {
    const r = validateAnswers(eyeCampReport, { ...EYE_ANSWERS, volunteers: 200, volunteer_hours: 150 });
    expect(r.ok).toBe(true);
    expect(paths(r.warnings)).toContain("volunteers");
    const sp = validateAnswers(eyeCampReport, { ...EYE_ANSWERS, registered: 60, male: 20, female: 20, cataract_found: 13 });
    expect(sp.ok).toBe(true);
    expect(paths(sp.warnings)).toContain("spectacles_total");
  });

  it("required, type and range errors carry EN and HI", () => {
    const r = validateAnswers(eyeCampReport, { ...EYE_ANSWERS, registered: undefined, volunteers: "lots", male: -1 });
    const fields = issuesToFieldMap(r.errors, "en");
    expect(fields).toMatchObject({ registered: "This is required.", volunteers: "Enter a whole number.", male: "Must be at least 0." });
    expect(issuesToFieldMap(r.errors, "hi").registered).toBe("यह आवश्यक है।");
  });

  it("follow-up rows need consent; blank rows are dropped", () => {
    const row = { name: "Person A", age: 61, gender: "female", phone: "98765 43210", locality: "Trilokpuri" };
    const without = validateAnswers(eyeCampReport, { ...EYE_ANSWERS, followup: [{ ...row, consent: false }] });
    expect(without.errors).toEqual([expect.objectContaining({ path: "followup.0.consent", code: "consent" })]);
    const missing = validateAnswers(eyeCampReport, { ...EYE_ANSWERS, followup: [row] });
    expect(paths(missing.errors)).toEqual(["followup.0.consent"]);
    const ok = validateAnswers(eyeCampReport, { ...EYE_ANSWERS, followup: [{}, { ...row, consent: true }] });
    expect(ok.ok).toBe(true);
    expect(ok.clean.followup).toHaveLength(1);
    const badPhone = validateAnswers(eyeCampReport, { ...EYE_ANSWERS, followup: [{ ...row, phone: "12", consent: true }] });
    expect(paths(badPhone.errors)).toEqual(["followup.0.phone"]);
  });

  it("splits personal data out and flattens KPI facts with dimensions", () => {
    const r = validateAnswers(eyeCampReport, {
      ...EYE_ANSWERS,
      followup: [{ name: "Person A", consent: true }],
    });
    const { answers, personal } = splitPersonal(eyeCampReport, r.clean);
    expect(personal).toHaveProperty("followup");
    expect(answers).not.toHaveProperty("followup");
    const facts = kpiFactsFromAnswers(eyeCampReport, r.clean);
    expect(facts).toContainEqual({ key: "eye.screened", dim: "", value: 115 });
    expect(facts).toContainEqual({ key: "eye.spectacles_by_power", dim: "+2.0", value: 20 });
    expect(facts.find((f) => f.key === "eye.cataract_surgeries")).toBeUndefined();
  });

  it("blood: units ≤ accepted, reasons ≤ deferred, accepted+deferred=registered is a warning", () => {
    const base = { samithi: "Karol Bagh", date: "2026-11-08", venue: "Hall", volunteers: 10, volunteer_hours: 40, registered: 60, deferred: 12, accepted: 48, units: 48, d_low_hb: 8, d_bp: 4 };
    expect(validateAnswers(bloodCampReport, base).ok).toBe(true);
    expect(paths(validateAnswers(bloodCampReport, { ...base, units: 49 }).errors)).toEqual(["units"]);
    expect(paths(validateAnswers(bloodCampReport, { ...base, d_other: 1 }).errors)).toEqual(["d_other"]);
    const w = validateAnswers(bloodCampReport, { ...base, accepted: 40, units: 40 });
    expect(w.ok).toBe(true);
    expect(paths(w.warnings)).toEqual(["accepted"]);
  });

  it("volunteer sign-up needs consent and a phone", () => {
    expect(validateAnswers(volunteerSignup, { first_name: "A", phone: "9000000002", consent: true }).ok).toBe(true);
    expect(paths(validateAnswers(volunteerSignup, { first_name: "A", phone: "9000000002", consent: false }).errors)).toEqual(["consent"]);
    expect(paths(validateAnswers(volunteerSignup, { first_name: "A", phone: "abc", consent: true }).errors)).toEqual(["phone"]);
  });
});
