// Plan event prefill from a forwarded WhatsApp message (contract v0.9.4).
import { describe, expect, it } from "vitest";
import { ApiError } from "@/server/http/errors";
import { SAMITHI, USER } from "@/server/mock/fixtures";
import { createServices } from "@/server/services/create";
import { planPrefill } from "@/server/services/portal/event-from-message";
import { extractEventByRules } from "@/server/ai";
import { MockRepo } from "@/server/repo/mock";
import { NOW } from "./support/services";

const MSG = `Sai Ram 🙏
*Free Eye Check-up Camp*
East 3 Samithi
Date: Sunday, 15 Nov 2026
Time: 9:00 am to 1:00 pm
Venue: Sai Seva Bhawan, Mayur Vihar Phase 1
Sevadals needed: 12
Please bring: Aadhaar card, old spectacles
Contact: Ramesh Kumar 98100 00011`;

function setup() {
  const svc = createServices(new MockRepo(), { now: () => NOW, mediaBase: "/media" });
  const actor = async (userId: string) => (await svc.auth.actorFor(userId, { requestId: "t", ipHash: null }))!;
  return { svc, actor };
}

describe("event from message", () => {
  it("maps the extract onto the Plan event form and leaves contact out", async () => {
    const x = await extractEventByRules({ text: MSG, now: NOW });
    const p = planPrefill(x, "S1");
    expect(p.prefill).toMatchObject({
      sevaType: "eye",
      date: "2026-11-15",
      startTime: "09:00",
      endTime: "13:00",
      samithiId: "S1",
      venueName: "Sai Seva Bhawan, Mayur Vihar Phase 1",
      volunteersNeeded: 12,
      bring: ["Aadhaar card", "old spectacles"],
    });
    expect(p.prefill.title).toMatch(/Eye Check-up Camp/);
    expect(p.prefill.description).not.toContain("98100");
    expect(p.check).not.toContain("samithiId");
  });

  it("flags required fields the message did not give", async () => {
    const p = planPrefill(await extractEventByRules({ text: "Bhajan this Thursday", now: NOW }), null);
    expect(p.check).toEqual(expect.arrayContaining(["samithiId", "venueName", "startsAt"]));
  });

  it("reads a chat report as a report, with kal = yesterday", async () => {
    const x = await extractEventByRules({ text: "Mayur Vihar eye camp kal ka report. 142 log aaye", now: NOW });
    expect(x.kind).toBe("report");
    expect(x.date! < new Date(NOW).toISOString().slice(0, 10)).toBe(true);
  });

  it("only picks a samithi inside the viewer's scope", async () => {
    const t = setup();
    const coord = await t.actor(USER.coordA);
    const own = await t.svc.portal.events.fromMessage(coord, MSG);
    expect(own.prefill.samithiId).toBe(SAMITHI.mayurVihar);
    const other = await t.svc.portal.events.fromMessage(coord, MSG.replace("East 3", "Central 1"));
    expect(other.prefill.samithiId).toBeNull();
    expect(other.check).toContain("samithiId");
    const state = await t.actor(USER.stateC);
    expect((await t.svc.portal.events.fromMessage(state, MSG.replace("East 3", "Central 1"))).prefill.samithiId).toBe(SAMITHI.karolBagh);
  });

  it("needs events.plan", async () => {
    const t = setup();
    const translator = await t.actor(USER.translatorE);
    await expect(t.svc.portal.events.fromMessage(translator, MSG)).rejects.toBeInstanceOf(ApiError);
  });
});
