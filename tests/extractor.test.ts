// Extractor: rules (numbers, dates, Hinglish, seva words) and the Ollama adapter.
import { describe, expect, it } from "vitest";
import { createExtractor, detectDate, detectSevaType, eventHints, HfExtractor, OllamaExtractor, rulesExtract } from "@/server/ai";
import type { ExtractField } from "@/server/ai";
import { eyeCampReport } from "@/server/forms/definitions";
import { chatQuestions } from "@/server/whatsapp/questions";

const FIELDS: ExtractField[] = chatQuestions(eyeCampReport, {}).map((f) => ({ id: f.id, label: f.label, min: f.min, max: f.max, required: f.required, kpi: f.kpi }));
const NOW = new Date("2026-10-22T08:00:00Z"); // 22 Oct, 13:30 IST

describe("rules extraction", () => {
  it("reads Hinglish counts next to their words", () => {
    const r = rulesExtract({ text: "Aaj eye camp tha. 142 log aaye, 60 male 82 female, 96 chashme diye", now: NOW, fields: FIELDS });
    expect(r.answers).toMatchObject({ registered: 142, male: 60, female: 82, spectacles_total: 96 });
    expect(r.model).toBe("rules");
    expect(r.fieldConfidence.registered.level).not.toBe("low");
    expect(r.fieldConfidence.registered.why?.en).toContain("142");
  });

  it("reads English labels and Devanagari digits", () => {
    const r = rulesExtract({ text: "Volunteers: 12, volunteer hours 48, screened ४५", now: NOW, fields: FIELDS });
    expect(r.answers).toMatchObject({ volunteers: 12, volunteer_hours: 48, registered: 45 });
  });

  it("does not take dates, times or phone numbers for counts", () => {
    const r = rulesExtract({ text: "Camp on 21/10/2026 from 9:30 am, call 9876543210. 70 patients screened", now: NOW, fields: FIELDS });
    expect(r.answers.registered).toBe(70);
    expect(Object.values(r.answers)).not.toContain(21);
    expect(Object.values(r.answers)).not.toContain(9876543210);
  });

  it("flags numbers outside a field's range instead of filling them", () => {
    const r = rulesExtract({ text: "5000 volunteers", now: NOW, fields: FIELDS });
    expect(r.answers.volunteers).toBeUndefined();
    expect(r.fieldConfidence.volunteers.level).toBe("low");
  });

  it("guesses a lone number for the headline field, marked low", () => {
    const r = rulesExtract({ text: "camp done 87", now: NOW, fields: FIELDS });
    expect(Object.values(r.answers)).toEqual([87]);
    expect(Object.values(r.fieldConfidence)[0].level).toBe("low");
  });

  it("leaves fields blank when the message does not say (never 0)", () => {
    const r = rulesExtract({ text: "camp went well, thank you all", now: NOW, fields: FIELDS });
    expect(r.answers).toEqual({});
  });
});

describe("dates and seva types", () => {
  it("understands aaj, kal, parso and written dates", () => {
    expect(detectDate("aaj camp tha", NOW)?.date).toBe("2026-10-22");
    expect(detectDate("kal ka report", NOW, "past")?.date).toBe("2026-10-21");
    expect(detectDate("kal camp hai", NOW, "future")?.date).toBe("2026-10-23");
    expect(detectDate("parso", NOW, "past")?.date).toBe("2026-10-20");
    expect(detectDate("camp on 17 Oct", NOW)?.date).toBe("2026-10-17");
    expect(detectDate("camp 17/10", NOW)?.date).toBe("2026-10-17");
    expect(detectDate("nothing here", NOW)).toBeNull();
  });

  it("spots seva-type words in English and Hinglish", () => {
    expect(detectSevaType("netra shivir, chashme diye")).toBe("eye");
    expect(detectSevaType("raktdaan camp, 40 donors")).toBe("blood");
    expect(detectSevaType("bhojan vitran")).toBe("narayan_seva");
    expect(detectSevaType("hello")).toBeNull();
    expect(eventHints("blood donation kal", NOW)).toMatchObject({ sevaType: "blood", date: { date: "2026-10-21" } });
  });
});

describe("ollama adapter", () => {
  const ok = (json: unknown) => (async () => new Response(JSON.stringify({ response: JSON.stringify(json) }), { status: 200 })) as unknown as typeof fetch;

  it("fills only the gaps the rules left, as low confidence, and names the model", async () => {
    const x = new OllamaExtractor({ url: "http://ollama.test", model: "smollm2:1.7b", fetch: ok({ registered: 1, volunteers: 12, volunteer_hours: 99999, male: "many" }) });
    const r = await x.extractFields({ text: "100 log aaye. sevadal bahut the", now: NOW, fields: FIELDS });
    expect(r.answers.registered).toBe(100); // from the rules, not the model
    expect(r.answers.volunteers).toBe(12);
    expect(r.fieldConfidence.volunteers.level).toBe("low");
    expect(r.answers.volunteer_hours).toBeUndefined(); // out of range
    expect(r.answers.male).toBeUndefined(); // not a number
    expect(r.model).toBe("rules+smollm2:1.7b");
  });

  it("falls back to the rules result when the model is down or answers nonsense", async () => {
    const down = new OllamaExtractor({ url: "http://ollama.test", model: "m", fetch: (async () => Promise.reject(new Error("refused"))) as unknown as typeof fetch });
    const broken = new OllamaExtractor({ url: "http://ollama.test", model: "m", fetch: (async () => new Response(JSON.stringify({ response: "not json" }), { status: 200 })) as unknown as typeof fetch });
    for (const x of [down, broken]) {
      const r = await x.extractFields({ text: "100 log aaye", now: NOW, fields: FIELDS });
      expect(r.answers.registered).toBe(100);
      expect(r.model).toBe("rules");
    }
  });

  it("is chosen by EXTRACTOR_PROVIDER", async () => {
    const cfg = { ollama: { url: "http://x", model: "m" }, hf: { model: "m", dtype: "q4" } };
    const rules = await createExtractor("rules", cfg).extractFields({ text: "100 log aaye", now: NOW, fields: FIELDS });
    expect(rules.model).toBe("rules");
    expect(createExtractor("ollama", cfg)).toBeInstanceOf(OllamaExtractor);
    expect(createExtractor("hf", cfg)).toBeInstanceOf(HfExtractor);
  });
});

/** One real call when a local Ollama with the small model is running (skipped otherwise). */
const OLLAMA = process.env.OLLAMA_URL ?? "http://127.0.0.1:11434";
const MODEL = process.env.OLLAMA_MODEL ?? "smollm2:1.7b";
async function ollamaReady(): Promise<boolean> {
  try {
    const res = await fetch(`${OLLAMA}/api/tags`, { signal: AbortSignal.timeout(1500) });
    const body = (await res.json()) as { models?: { name: string }[] };
    return !!body.models?.some((m) => m.name === MODEL);
  } catch {
    return false;
  }
}
const ready = await ollamaReady();

describe.skipIf(!ready)("ollama smoke (local model)", () => {
  it("returns a valid draft without throwing", async () => {
    const x = new OllamaExtractor({ url: OLLAMA, model: MODEL, timeoutMs: 40_000 });
    const r = await x.extractFields({ text: "Yesterday's eye camp: sevadals 12 came and we worked 40 hours in total", now: NOW, fields: FIELDS });
    for (const [id, v] of Object.entries(r.answers)) {
      const f = FIELDS.find((x) => x.id === id)!;
      expect(Number.isInteger(v)).toBe(true);
      expect(v as number).toBeGreaterThanOrEqual(f.min ?? 0);
      if (f.max !== null) expect(v as number).toBeLessThanOrEqual(f.max);
    }
    expect(r.model.startsWith("rules")).toBe(true);
  }, 60_000);
});
