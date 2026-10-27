// Regression guard: the rules alone must keep their score on the eval set
// (tests/evals/event-extract.cases.json). Raise the floors when the rules improve.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { EventExtract } from "@/contract";
import { extractEventByRules } from "@/server/ai";
import { scoreCase, totals, type EvalCase } from "@/server/ai/event/score";

const cases = JSON.parse(readFileSync("tests/evals/event-extract.cases.json", "utf8")) as EvalCase[];

describe("event extract eval (rules)", () => {
  const results = cases.map((c) => extractEventByRules({ text: c.text, now: new Date(`${c.sentAt}T10:00:00+05:30`) }));
  const t = totals(results.map((r, i) => scoreCase(r, cases[i].expect)));

  it("returns valid EventExtract for every case", () => {
    for (const r of results) expect(EventExtract.safeParse(r).success).toBe(true);
  });

  it("keeps field accuracy and hallucination at the recorded level", () => {
    expect(t.accuracy).toBeGreaterThanOrEqual(0.9);
    expect(t.hallucination).toBeLessThanOrEqual(0.025);
  });
});
