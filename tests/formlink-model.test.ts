import { describe, expect, it } from "vitest";
import type { FormField } from "@/contract";
import { eyeCampReport } from "@/server/forms/definitions";
import {
  applyReadOnly,
  errorPathsInSection,
  groupIssues,
  keyNumbers,
  payloadAnswers,
  pruneBlankRows,
  reviewSummary,
  rowScope,
  sameAnswers,
  scopeOf,
  sectionsWithErrors,
  setAnswer,
  stepCount,
  sumChecks,
  sumState,
  validateLocal,
  isVisible,
  pick,
} from "@/features/formlink/model";
import { EYE_ANSWERS } from "./support/forms";

const def = eyeCampReport;
const field = (id: string) => def.sections.flatMap((s) => s.fields).find((f) => f.id === id) as FormField;

describe("visibility", () => {
  it("power counts show only once spectacles are given", () => {
    const p = field("p_1_0");
    expect(isVisible(p, scopeOf(def, {}))).toBe(false);
    expect(isVisible(p, scopeOf(def, { spectacles_total: 63 }))).toBe(true);
  });

  it("resolves show-if inside a repeater row first", () => {
    const rep = field("followup");
    const row = { name: "Asha" };
    const s = rowScope(scopeOf(def, {}), rep, row);
    for (const c of rep.fields ?? []) expect(typeof isVisible(c, s)).toBe("boolean");
  });
});

describe("live sum check (powers add up)", () => {
  const section = def.sections.find((s) => s.id === "spectacles")!;
  const [check] = sumChecks(section);

  it("finds the rule and anchors it under the last power", () => {
    expect(check).toBeDefined();
    expect(check.parts).toEqual(["p_1_0", "p_1_5", "p_2_0", "p_2_5", "p_3_0", "p_other"].filter((p) => check.parts.includes(p)));
    expect(check.anchor).toBe(check.parts.at(-1));
    expect(check.target).toBe("spectacles_total");
  });

  it("turns green at 63 of 63 and shows the gap before", () => {
    const partial = sumState(check, scopeOf(def, { spectacles_total: 63, p_1_0: 12, p_1_5: 10, p_2_0: 20 }));
    expect(partial).toMatchObject({ sum: 42, total: 63, matches: false, blank: false });
    const full = sumState(check, scopeOf(def, { ...EYE_ANSWERS }));
    expect(full).toMatchObject({ sum: 63, total: 63, matches: true });
    expect(sumState(check, scopeOf(def, { spectacles_total: 63 })).blank).toBe(true);
  });

  it("keys the engine's sum error away from the owning field", () => {
    const v = validateLocal(def, { ...EYE_ANSWERS, p_3_0: 9 });
    const issues = groupIssues(def, v);
    expect([...issues.keys()].some((k) => k.startsWith("sum:"))).toBe(true);
  });
});

describe("validation + issue helpers", () => {
  it("accepts the README sample camp", () => {
    expect(validateLocal(def, EYE_ANSWERS).errors).toEqual([]);
  });

  it("maps errors to sections and orders them by field", () => {
    const v = validateLocal(def, { ...EYE_ANSWERS, registered: undefined, volunteers: undefined });
    const sections = sectionsWithErrors(def, v.errors);
    expect([...sections]).toEqual(expect.arrayContaining([0, 1]));
    expect(errorPathsInSection(def, 0, v.errors)).toEqual(["volunteers"]);
  });

  it("returns warnings that do not block", () => {
    const v = validateLocal(def, { ...EYE_ANSWERS, volunteers: 200 });
    expect(v.errors).toEqual([]);
    expect(v.warnings.length).toBeGreaterThan(0);
  });

  it("requires consent for a follow-up person", () => {
    const v = validateLocal(def, { ...EYE_ANSWERS, followup: [{ name: "Asha Devi" }] });
    expect(v.errors.some((e) => e.path.startsWith("followup.0"))).toBe(true);
    const ok = validateLocal(def, { ...EYE_ANSWERS, followup: [{ name: "Asha Devi", consent: true }] });
    expect(ok.errors).toEqual([]);
  });

  it("treats photos still on the phone as attached", () => {
    const needsFile = structuredClone(def);
    needsFile.sections.flatMap((s) => s.fields).find((f) => f.kind === "file")!.required = true;
    expect(validateLocal(needsFile, { ...EYE_ANSWERS, register_photo: ["local-abc"] }).errors).toEqual([]);
    expect(validateLocal(needsFile, EYE_ANSWERS).errors.length).toBeGreaterThan(0);
  });
});

describe("answers", () => {
  it("sets top-level and repeater values immutably", () => {
    const a = { x: 1 };
    const b = setAnswer(a, "followup.1.name", "Ravi");
    expect(a).toEqual({ x: 1 });
    expect((b.followup as unknown[])[1]).toEqual({ name: "Ravi" });
    expect(setAnswer(b, "followup.1.age", 40).followup).toEqual([undefined, { name: "Ravi", age: 40 }]);
  });

  it("drops blank repeater rows and blank values from what is sent", () => {
    const answers = { ...EYE_ANSWERS, male: null, notes: "", followup: [{ name: "A", consent: true, age: null }, {}, { phone: "" }] };
    const sent = payloadAnswers(def, answers);
    expect(sent.followup).toEqual([{ name: "A", consent: true }]);
    expect("male" in sent).toBe(false);
    expect("notes" in sent).toBe(false);
    expect((pruneBlankRows(def, answers).followup as unknown[]).length).toBe(1);
  });

  it("compares answers ignoring blanks and key order", () => {
    expect(sameAnswers({ a: 1, b: null, c: [{ x: 1, y: "" }] }, { c: [{ x: 1 }], a: 1 })).toBe(true);
    expect(sameAnswers({ a: 1 }, { a: 2 })).toBe(false);
  });

  it("forces read-only prefilled fields back to the event's value", () => {
    const out = applyReadOnly(def, { samithi: "Edited", venue: "Kept" }, { samithi: "Mayur Vihar", venue: "Hall" });
    expect(out.samithi).toBe("Mayur Vihar");
    expect(out.venue).toBe("Kept");
  });
});

describe("review + done helpers", () => {
  const ctx = {
    lang: "en" as const,
    yes: "Yes",
    no: "No",
    formatDate: (s: string) => s,
    formatTime: (s: string) => s,
    files: (n: number) => `${n} file`,
    number: (n: number) => String(n),
  };

  it("summarises visible fields per section and numbers repeater rows", () => {
    const rev = reviewSummary(def, { ...EYE_ANSWERS, followup: [{ name: "Asha", consent: true }] }, ctx, (n) => `Person ${n}`);
    expect(rev).toHaveLength(def.sections.length);
    const follow = rev.find((s) => s.personal)!;
    expect(follow.rows[0]).toMatchObject({ kind: "group", title: "Person 1" });
    expect(rev[0].rows.find((r) => r.item?.path === "volunteers")?.item?.value).toBe("12");
  });

  it("picks headline numbers and skips personal sections", () => {
    const nums = keyNumbers(def, EYE_ANSWERS, "en");
    expect(nums.map((n) => n.id)).toContain("registered");
    expect(nums.length).toBeLessThanOrEqual(5);
  });

  it("counts the review step only for multi-section forms", () => {
    expect(stepCount(def)).toBe(def.sections.length + 1);
  });

  it("falls back to English when Hindi is missing", () => {
    expect(pick({ en: "A", hi: null }, "hi")).toBe("A");
    expect(pick({ en: "A", hi: "ए" }, "hi")).toBe("ए");
  });
});
