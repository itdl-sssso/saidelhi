// Event announcements from WhatsApp: rules, normalisers and the Hugging Face adapter (model injected).
import { describe, expect, it } from "vitest";
import { EventExtract } from "@/contract";
import { checkReply } from "@/server/ai/event/model";
import { extractEvent, extractEventByRules, HfExtractor, parseDate, parseTime, parseTimeRange, resolveSamithi, RulesExtractor } from "@/server/ai";

const NOW = new Date("2026-10-22T08:00:00Z"); // 22 Oct, 13:30 IST

const GGN4 = `OM SRI SAI RAM

 GGN 4 Samithi bhajan

 Date : 24th October 2026    Saturday

 Address :    Palam Vihar Sai Centre.

 Timings :    6.00 p.m. to 7.00 p.m

All are requested to kindly join and partake the blessings of our beloved swami.


Sevadal: Please reach before 10 minutes.

Sairam 🙏 🌹`;

describe("announcement rules", () => {
  it("reads the GGN 4 bhajan message", () => {
    const r = extractEventByRules({ text: GGN4, now: NOW });
    expect(EventExtract.parse(r)).toEqual(r);
    expect(r).toMatchObject({
      kind: "announcement",
      sevaType: "bhajan",
      samithi: { raw: "GGN 4", slug: "gurugram-4", name: "Gurugram 4" },
      title: "GGN 4 Samithi bhajan",
      date: "2026-10-24",
      startTime: "18:00",
      endTime: "19:00",
      startsAt: "2026-10-24T12:30:00.000Z",
      endsAt: "2026-10-24T13:30:00.000Z",
      venueName: "Palam Vihar Sai Centre",
      venueAddress: null,
      sevadalNote: "Please reach before 10 minutes",
      model: "rules",
    });
    expect(r.fieldConfidence.date.level).toBe("high");
    expect(r.fieldConfidence.samithi.level).toBe("high");
    expect(r.fieldConfidence.title.level).toBe("check");
  });

  it("keeps a venue line as written", () => {
    const r = extractEventByRules({ text: "Study circle\nVenue: Sai Centre, H-12, Sector 21, Faridabad\nTime: 10 am - 12 pm\nDate: 2 Nov", now: NOW });
    expect(r).toMatchObject({ sevaType: "study_circle", venueName: "Sai Centre, H-12, Sector 21, Faridabad", venueAddress: null, startTime: "10:00", endTime: "12:00", date: "2026-11-02" });
  });

  it("calls a past event with counts a report", () => {
    const r = extractEventByRules({ text: "Eye camp was held on 18 Oct at Sector 50. 142 people screened.", now: NOW });
    expect(r.kind).toBe("report");
  });

  it("finds an unlabelled venue after 'at'", () => {
    const r = extractEventByRules({ text: "Bhajan on Saturday at Palam Vihar Sai Centre, 6 to 7 pm. All welcome.", now: NOW });
    expect(r).toMatchObject({ kind: "announcement", venueName: "Palam Vihar Sai Centre", date: "2026-10-24", startTime: "18:00", endTime: "19:00" });
    expect(r.fieldConfidence.venueName.level).toBe("check");
    expect(extractEventByRules({ text: "Sai Ram 🙏 Bhajan kal. Jagah Palam Vihar Sai Centre ke paas.", now: NOW })).toMatchObject({
      title: "Bhajan kal",
      venueName: "Palam Vihar Sai Centre",
    });
  });

  it("leaves unknown things null and marks an unknown samithi low", () => {
    const r = extractEventByRules({ text: "East 9 samithi meeting soon", now: NOW });
    expect(r).toMatchObject({ date: null, startTime: null, venueName: null, startsAt: null, samithi: { raw: "East 9", slug: null } });
    expect(r.fieldConfidence.samithi.level).toBe("low");
  });
});

describe("normalisers", () => {
  it.each([
    ["6.00 p.m.", "18:00"],
    ["6:30pm", "18:30"],
    ["12 noon 12:00", "12:00"],
    ["12 am", "00:00"],
    ["18:15", "18:15"],
    ["shaam 6 baje", "18:00"],
    ["10 minutes", null],
  ])("time %s → %s", (raw, want) => expect(parseTime(raw)).toBe(want));

  it("reads ranges with the meridiem written once", () => {
    expect(parseTimeRange("6 - 7 pm")).toEqual({ start: "18:00", end: "19:00" });
    expect(parseTimeRange("6:00 - 7:30 pm")).toEqual({ start: "18:00", end: "19:30" });
    expect(parseTimeRange("10:00 AM – 1 PM")).toEqual({ start: "10:00", end: "13:00" });
  });

  it("keeps a written year and rolls a passed day into next year", () => {
    expect(parseDate("24th October 2026 Saturday", NOW)).toBe("2026-10-24");
    expect(parseDate("October 24, 2026", NOW)).toBe("2026-10-24");
    expect(parseDate("3 Jan", NOW)).toBe("2027-01-03");
    expect(parseDate("kal", NOW)).toBe("2026-10-23");
    expect(parseDate("this Saturday", NOW)).toBe("2026-10-24"); // NOW is a Thursday
    expect(parseDate("next saturday", NOW)).toBe("2026-10-31");
    expect(parseDate("shanivar ko", NOW)).toBe("2026-10-24");
  });

  it("resolves samithi shorthands to known units", () => {
    expect(resolveSamithi("Gurgaon-4 Samiti")).toMatchObject({ slug: "gurugram-4", named: true });
    expect(resolveSamithi("GZB 2")).toMatchObject({ slug: "ghaziabad-2" });
    expect(resolveSamithi("south east 3")).toMatchObject({ slug: "south-east-3" });
    expect(resolveSamithi("nothing here")).toBeNull();
  });
});

describe("HfExtractor", () => {
  const SPARSE = "Sai Ram. Bhajan this Saturday evening, all welcome. Contact Ramesh.";
  // No "at"/"Address:" before the place, so only the model can find the venue.
  const HINGLISH = "Sai Ram 🙏 GGN 4 bhajan programme hai, sab aayiye. Sab log Palam Vihar Sai Centre pahunchiye. 24 October, shaam 6 baje se.";

  it("skips the model when the rules read everything", async () => {
    let calls = 0;
    const x = new HfExtractor({ model: "m", dtype: "q4", generate: async () => (calls++, "{}") });
    const r = await x.extractEvent({ text: GGN4, now: NOW });
    expect(calls).toBe(0);
    expect(r.model).toBe("rules");
  });

  it("asks only for missing fields and keeps values it can see in the message, marked low", async () => {
    let prompt = "";
    const reply = 'Sure! ```json\n{"venue_name":"Palam Vihar Sai Centre","end_time":"7 pm","venue_address":"Address"}\n```';
    const x = new HfExtractor({
      model: "HuggingFaceTB/SmolLM2-360M-Instruct",
      dtype: "q4",
      generate: async (m) => ((prompt = m[0].content), reply),
    });
    const r = await x.extractEvent({ text: HINGLISH, now: NOW });
    expect(EventExtract.parse(r)).toEqual(r);
    expect(prompt).toContain("venue_name");
    expect(prompt).not.toContain("seva_type");
    expect(r).toMatchObject({
      sevaType: "bhajan",
      samithi: { slug: "gurugram-4" },
      date: "2026-10-24",
      startTime: "18:00",
      startsAt: "2026-10-24T12:30:00.000Z",
      venueName: "Palam Vihar Sai Centre", // model, seen in the text
      title: "GGN 4 bhajan programme hai, sab aayiye", // greeting dropped
      endTime: null, // "7 pm" is not in the message
      venueAddress: null, // label echoed back
      model: "rules+SmolLM2-360M-Instruct",
    });
    expect(r.fieldConfidence.venueName.level).toBe("low");
    expect(r.fieldConfidence.date.level).not.toBe("low");
  });

  it("drops invented values and reads 'this Saturday' itself", async () => {
    const reply = '{"seva_type":"eye","samithi":"GGN 4","date":"2023-05-01","start_time":"08:00","venue_name":"Palam Vihar Sai Centre"}';
    const r = await new HfExtractor({ model: "m", dtype: "q4", generate: async () => reply }).extractEvent({ text: SPARSE, now: NOW });
    expect(r).toMatchObject({ sevaType: "bhajan", samithi: null, date: "2026-10-24", startTime: null, venueName: null, model: "rules" });
  });

  it("keeps the complete pairs of a reply cut off at the token limit", async () => {
    const reply = '{\n  "venue_name": "Palam Vihar Sai Centre",\n  "sevadal_note": "I will be here to help you. I will be';
    const r = await new HfExtractor({ model: "m", dtype: "q4", generate: async () => reply }).extractEvent({ text: HINGLISH, now: NOW });
    expect(r).toMatchObject({ venueName: "Palam Vihar Sai Centre", sevadalNote: null, model: "rules+m" });
  });

  it("falls back to the rules when the model fails or talks nonsense", async () => {
    for (const generate of [async () => Promise.reject(new Error("oom")), async () => "I cannot help with that."]) {
      const r = await new HfExtractor({ model: "m", dtype: "q4", generate }).extractEvent({ text: SPARSE, now: NOW });
      expect(r).toMatchObject({ model: "rules", sevaType: "bhajan", date: "2026-10-24" });
    }
  });

  it("fills missing counts for reports", async () => {
    const x = new HfExtractor({ model: "m", dtype: "q4", generate: async () => '{"volunteers": 9, "registered": "lots"}' });
    const fields = [
      { id: "registered", label: { en: "People registered", hi: null }, min: 0, max: 5000, required: true, kpi: null },
      { id: "volunteers", label: { en: "Sevadals", hi: null }, min: 0, max: 500, required: false, kpi: null },
    ];
    const r = await x.extractFields({ text: "Camp done, 120 people registered, sab sevadal aaye", now: NOW, fields });
    expect(r.answers).toEqual({ registered: 120, volunteers: 9 });
    expect(r.model).toBe("rules+m");
  });

  it("rules extractor reads announcements too", async () => {
    expect((await new RulesExtractor().extractEvent({ text: GGN4, now: NOW })).startsAt).toBe("2026-10-24T12:30:00.000Z");
  });
});

describe("model reply type check", () => {
  it("coerces what small models write and reports the rest", () => {
    const { values, rejected } = checkReply(
      { title: "  Bhajan.  ", venue_name: "null", volunteers_needed: "12", services: "free medicines, BP check", bring: 5, mood: "happy", date: ["x"] },
      ["title", "venue_name", "volunteers_needed", "services", "bring", "date"],
    );
    expect(values).toEqual({ title: "Bhajan", venue_name: null, volunteers_needed: 12, services: ["free medicines", "BP check"] });
    expect(rejected.map((r) => [r.field, r.reason.split(":")[0]])).toEqual([
      ["bring", "wrong type"],
      ["mood", "unknown key"],
      ["date", "wrong type"],
    ]);
  });

  it("ignores keys that were not asked for", () => {
    expect(checkReply({ title: "X" }, ["date"]).values).toEqual({});
  });

  it("keeps grounded model values and lists dropped ones in rejected", async () => {
    const text = "Sai Ram. Narayan seva at Sai Centre on 2 Nov, 11 am. Contact Ravi 98100 00011. 20 volunteers needed.";
    const reply = JSON.stringify({ venue_name: "Sai Centre", contact_name: "Ravi", contact_phone: "9999999999", volunteers_needed: 50, partner: "Apollo Hospital" });
    const r = await extractEvent({ text, now: NOW }, { name: "m", generate: async () => reply });
    expect(r.venueName).toBe("Sai Centre");
    expect(r.volunteersNeeded).toBe(20); // rules; the model's 50 is not asked for
    expect(r.contact?.phone).toBe("98100 00011");
    expect(r.rejected).toEqual([]);
    expect(EventExtract.parse(r)).toEqual(r);
  });

  it("records an unreadable reply", async () => {
    const r = await extractEvent({ text: "Bhajan at 6 pm today", now: NOW }, { name: "m", generate: async () => "I cannot help" });
    expect(r.model).toBe("rules");
    expect(r.rejected[0]).toMatchObject({ field: "*", reason: "no JSON object in reply" });
  });
});
