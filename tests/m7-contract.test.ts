import { describe, expect, it } from "vitest";
import {
  approveBlockers,
  DISCOURSE_THEMES,
  DiscourseTheme,
  glossaryIssues,
  publishBlockers,
  quoteMatches,
  VALUE_DISCOURSE_THEMES,
} from "@/contract";

describe("v0.8 discourses contract", () => {
  it("labels every theme and maps every value to themes", () => {
    expect(Object.keys(DISCOURSE_THEMES).sort()).toEqual([...DiscourseTheme.options].sort());
    for (const themes of Object.values(VALUE_DISCOURSE_THEMES)) expect(themes.length).toBeGreaterThan(0);
  });

  it("flags glossary terms whose fixed Hindi is missing", () => {
    const g = [{ term: "viveka", hi: "विवेक", gloss: null }, { term: "Dharma", hi: "धर्म", gloss: null }];
    expect(glossaryIssues("Use viveka and dharma.", "समझ और धर्म।", g)).toEqual([{ term: "viveka", expected: "विवेक" }]);
    expect(glossaryIssues("Use viveka.", null, g)).toEqual([]);
  });

  it("requires quotes to be verbatim in their block", () => {
    const blocks = [{ id: "s1", en: "Character is  the true wealth of a student." }];
    expect(quoteMatches({ en: "Character is the true wealth", blockId: "s1" }, blocks)).toBe(true);
    expect(quoteMatches({ en: "Character is wealth", blockId: "s1" }, blocks)).toBe(false);
    expect(quoteMatches({ en: "Character", blockId: null }, blocks)).toBe(false);
  });

  it("explains approve/publish gates", () => {
    expect(approveBlockers({ blocks: [{ status: "approved" }, { status: "ai_draft" }], quotes: [1] })).toEqual(["blocks", "quotes"]);
    expect(approveBlockers({ blocks: [{ status: "approved" }], quotes: [1, 2] })).toEqual([]);
    expect(publishBlockers("in_review", false)).toEqual(["flag_off", "not_approved"]);
    expect(publishBlockers("approved", true)).toEqual([]);
  });
});
