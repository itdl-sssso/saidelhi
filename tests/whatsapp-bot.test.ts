// WhatsApp bot (spec 50) on the in-memory repo: language, menus by role, plan,
// approvals, report-by-chat, errors, timeout, hand-off, near me.
import { describe, expect, it } from "vitest";
import { SAMITHI } from "@/server/mock/fixtures";
import { templateButtons } from "@/server/providers/whatsapp/templates";
import { fmtWhen } from "@/server/whatsapp/bot/approvals";
import { COPY, pick } from "@/server/whatsapp/bot/copy";
import { buttonIds, EVENT, PUBLIC_PHONE, phone, rowIds, texts, waSetup } from "./support/wa";

describe("language and menus", () => {
  it("asks the language once for a public number, then remembers it", async () => {
    const t = waSetup();
    const first = await t.say(PUBLIC_PHONE, "hello");
    expect(buttonIds(first)).toEqual(["lang:en", "lang:hi"]);
    const picked = await t.tap(PUBLIC_PHONE, "lang:hi");
    expect(texts(picked)).toContain("हिन्दी");
    // public menu: three quick replies, in Hindi
    const menu = picked.at(-1)!;
    expect(menu.buttons?.map((b) => b.id)).toEqual(["m:near", "m:join", "m:contact"]);
    expect(menu.buttons?.[0].title).toBe("मेरे पास क्या है");
    const again = await t.say(PUBLIC_PHONE, "menu");
    expect(buttonIds(again)).not.toContain("lang:en");
    expect(again[0].text).toBe(pick("hi", COPY.menuPublic));
    // and it can be changed
    expect(buttonIds(await t.say(PUBLIC_PHONE, "language"))).toEqual(["lang:en", "lang:hi"]);
  });

  it("shows coordinators the work menu in their saved language, approvals only for districts", async () => {
    const t = waSetup();
    const coord = await t.say(phone(1), "menu");
    expect(rowIds(coord)).toEqual(["m:plan", "m:report", "m:events", "m:help"]);
    expect(coord[0].text).toContain("नमस्ते");
    const district = await t.say(phone(2), "menu");
    expect(rowIds(district)).toEqual(["m:plan", "m:report", "m:events", "m:approvals", "m:help"]);
    expect(district[0].list?.sections[0].rows.every((r) => r.title.length <= 24)).toBe(true);
  });

  it("keeps public numbers out of coordinator flows", async () => {
    const t = waSetup();
    await t.tap(PUBLIC_PHONE, "lang:en");
    expect(texts(await t.say(PUBLIC_PHONE, "plan"))).toBe(pick("en", COPY.notAllowed));
  });
});

describe("approval template buttons and copy", () => {
  it("plan and report approval templates carry quick-reply buttons whose ids the bot handles", () => {
    expect(templateButtons("plan_approval_request", "en", "E1")).toEqual([
      { id: "ap:yes:E1", title: "Approve" },
      { id: "ap:no:E1", title: "Reject" },
      { id: "ap:ask:E1", title: "Ask" },
    ]);
    expect(templateButtons("report_approval_request", "hi", "E1")?.map((b) => b.id)).toEqual(["ap:yes:E1", "ap:no:E1"]);
    expect(templateButtons("report_approval_request", "en", "E1")?.[1].title).toBe("Request changes");
    expect(templateButtons("login_code", "en", "E1")).toBeNull();
    expect(templateButtons("plan_approval_request", "en", undefined)).toBeNull();
  });

  it("formats times in Hindi without am/pm", () => {
    const d = new Date("2026-10-23T03:30:00.000Z"); // 9:00 IST
    expect(fmtWhen(d, "hi")).toMatch(/सुबह 9:00$/);
    expect(fmtWhen(new Date("2026-10-23T12:00:00.000Z"), "hi")).toMatch(/शाम 5:30$/);
    expect(fmtWhen(new Date("2026-10-23T16:00:00.000Z"), "hi")).toMatch(/रात 9:30$/);
    expect(fmtWhen(d, "hi")).not.toMatch(/am|pm/i);
  });

  it("after a flow the menu is offered, and help is role-specific", async () => {
    const t = waSetup();
    const samithi = await t.say(phone(1), "help");
    expect(samithi[0].text).toBe(pick("hi", COPY.help));
    expect(samithi[0].text).not.toMatch(/approve|स्वीकृत/i);
    const district = await t.say(phone(2), "help");
    expect(district[0].text).toBe(pick("en", COPY.helpApprover));
  });
});

describe("plan an activity", () => {
  async function planAsCoordA(t: ReturnType<typeof waSetup>) {
    const from = phone(1);
    expect(rowIds(await t.tap(from, "m:plan"))).toContain("seva:eye");
    expect(buttonIds(await t.tap(from, "seva:eye"))).toEqual(["date:today", "date:tomorrow", "date:pick"]);
    await t.tap(from, "date:tomorrow");
    await t.say(from, "9 am");
    await t.say(from, "Hall 5, Mayur Vihar");
    await t.say(from, "20");
    const summary = await t.tap(from, "skip");
    expect(buttonIds(summary)).toEqual(["c:yes", "c:edit", "c:no"]);
    expect(summary[0].text).toContain("Hall 5, Mayur Vihar");
    return t.tap(from, "c:yes");
  }

  it("creates the event, sends it to the district and pushes the approval card", async () => {
    const t = waSetup();
    const done = await planAsCoordA(t);
    expect(done[0].text).toContain("पूर्व"); // East, in Hindi
    const { rows } = await t.repo.portal.listAdminEvents({ samithiIds: [SAMITHI.mayurVihar], statuses: ["awaiting_approval"], sort: "-updatedAt", limit: 50, offset: 0 });
    const ev = rows.find((e) => e.venueName === "Hall 5, Mayur Vihar")!;
    expect(ev.sevaType).toBe("eye");
    expect(ev.startsAt.toISOString()).toBe("2026-10-23T03:30:00.000Z"); // 9:00 IST tomorrow
    expect(ev.volunteersNeeded).toBe(20);
    // title is seva + samithi, not the venue; approval template carries the event id for its buttons
    expect(ev.titleEn).not.toContain("Hall 5");
    expect(ev.titleEn).toMatch(/^Eye camp – /i);
    expect(t.whatsapp.sent.find((s) => s.template === "plan_approval_request")?.buttonRef).toBe(ev.id);
    expect(ev.descriptionHi).toBeTruthy();
    // district notified by template, and by card because they chatted today
    expect(t.whatsapp.sent.some((s) => s.template === "plan_approval_request" && s.to === phone(2))).toBe(true);
    const card = t.whatsapp.interactive.find((m) => m.to === phone(2) && m.message.buttons?.some((b) => b.id === `ap:yes:${ev.id}`));
    expect(card?.message.buttons?.map((b) => b.id)).toEqual([`ap:yes:${ev.id}`, `ap:no:${ev.id}`, `ap:ask:${ev.id}`]);
  });

  it("validates date, time and volunteers before moving on", async () => {
    const t = waSetup();
    const from = phone(1);
    await t.tap(from, "m:plan");
    await t.tap(from, "seva:blood");
    await t.tap(from, "date:pick");
    expect(texts(await t.say(from, "sometime"))).toBe(pick("hi", COPY.planDateBad));
    expect(texts(await t.say(from, "1/1/2020"))).toBe(pick("hi", COPY.planDatePast));
    await t.say(from, "25 Oct");
    expect(texts(await t.say(from, "whenever"))).toBe(pick("hi", COPY.planTimeBad));
    await t.say(from, "17:30");
    await t.say(from, "Community hall");
    // the re-prompt keeps the Skip button
    const bad = await t.say(from, "twenty");
    expect(texts(bad)).toBe(pick("hi", COPY.planVolunteersBad));
    expect(buttonIds(bad)).toEqual(["skip"]);
    expect(texts(await t.say(from, "99999"))).toBe(pick("hi", COPY.planVolunteersBad));
  });

  it("lets a district coordinator plan for a samithi and self-approves", async () => {
    const t = waSetup();
    const from = phone(2);
    await t.tap(from, "m:plan");
    await t.tap(from, "seva:cleanliness");
    expect(texts(await t.say(from, "Atlantis"))).toContain("Try one of");
    await t.say(from, "East 4");
    await t.tap(from, "date:today");
    await t.say(from, "6 pm");
    await t.say(from, "Park gate");
    await t.tap(from, "skip");
    await t.tap(from, "skip");
    const done = await t.tap(from, "c:yes");
    expect(texts(done)).toContain("approved");
    const { rows } = await t.repo.portal.listAdminEvents({ statuses: ["planned"], sort: "-updatedAt", limit: 50, offset: 0 });
    expect(rows.some((e) => e.venueName === "Park gate" && e.selfApproved)).toBe(true);
  });
});

describe("district approvals by chat", () => {
  async function pending(t: ReturnType<typeof waSetup>) {
    // coordinator A's plan goes to East
    const from = phone(1);
    await t.tap(from, "m:plan");
    await t.tap(from, "seva:eye");
    await t.tap(from, "date:tomorrow");
    await t.say(from, "10 am");
    await t.say(from, "School ground");
    await t.tap(from, "skip");
    await t.tap(from, "skip");
    await t.tap(from, "c:yes");
    const { rows } = await t.repo.portal.listAdminEvents({ statuses: ["awaiting_approval"], sort: "-updatedAt", limit: 50, offset: 0 });
    return rows.find((e) => e.venueName === "School ground")!;
  }

  it("approves from a card: plan becomes planned, links go out, the planner is told", async () => {
    const t = waSetup();
    const ev = await pending(t);
    const reply = await t.tap(phone(2), `ap:yes:${ev.id}`);
    expect(texts(reply)).toContain(pick("en", COPY.approvedOk));
    expect((await t.repo.eventById(ev.id))?.status).toBe("planned");
    expect(t.whatsapp.sent.some((s) => s.template === "form_link_sent" && s.to === phone(1))).toBe(true);
    expect(t.whatsapp.sent.some((s) => s.template === "plan_decision" || t.whatsapp.texts.some((x) => x.to === phone(1)))).toBe(true);
    // deciding twice is harmless
    expect(texts(await t.tap(phone(2), `ap:yes:${ev.id}`))).toBe(pick("en", COPY.alreadyDecided));
  });

  it("asks for a reason before sending a plan back", async () => {
    const t = waSetup();
    const ev = await pending(t);
    expect(texts(await t.tap(phone(2), `ap:no:${ev.id}`))).toBe(pick("en", COPY.rejectWhy));
    expect(texts(await t.say(phone(2), "x"))).toBe(pick("en", COPY.rejectWhy)); // too short
    expect(texts(await t.say(phone(2), "Wrong date, please check Diwali week"))).toContain(pick("en", COPY.rejectDone));
    expect((await t.repo.eventById(ev.id))?.status).toBe("draft");
    const timeline = await t.repo.portal.timelineFor([ev.id]);
    expect(timeline.some((s) => s.note?.includes("Wrong date"))).toBe(true);
  });

  it("forwards a question to the planner and their answer back", async () => {
    const t = waSetup();
    const ev = await pending(t);
    await t.tap(phone(2), `ap:ask:${ev.id}`);
    await t.say(phone(2), "Is the school ground booked?");
    const asked = [...t.whatsapp.texts, ...t.whatsapp.sent.map((s) => ({ to: s.to, text: s.params.join(" ") }))];
    expect(asked.some((x) => x.to === phone(1) && x.text.includes("Is the school ground booked?"))).toBe(true);
    const back = await t.say(phone(1), "Yes, booked for the whole day");
    expect(texts(back)).toContain(pick("hi", COPY.replyForwarded));
    const reached = [...t.whatsapp.texts, ...t.whatsapp.sent.map((s) => ({ to: s.to, text: s.params.join(" ") }))];
    expect(reached.some((x) => x.to === phone(2) && x.text.includes("booked for the whole day"))).toBe(true);
  });

  it("lists waiting approvals for a district coordinator and shows a card", async () => {
    const t = waSetup();
    const list = await t.tap(phone(2), "m:approvals");
    const ids = rowIds(list);
    expect(ids.length).toBeGreaterThan(0);
    expect(ids).toContain(`ap:${EVENT.eyeMayurPlan}`);
    const card = await t.tap(phone(2), `ap:${EVENT.eyeMayurPlan}`);
    expect(buttonIds(card)).toEqual([`ap:yes:${EVENT.eyeMayurPlan}`, `ap:no:${EVENT.eyeMayurPlan}`, `ap:ask:${EVENT.eyeMayurPlan}`]);
    // a samithi coordinator may not
    expect(texts(await t.tap(phone(1), "m:approvals"))).toBe(pick("hi", COPY.notAllowed));
  });
});

describe("report totals by chat", () => {
  /** Answers a question by its label; optional ones are skipped. */
  const answerFor = (text: string): string | null => {
    if (text.includes("Sevadal hours")) return "40";
    if (text.includes("Sevadal members")) return "10";
    if (text.includes("Registered and screened")) return "100";
    if (/\bMen\b/.test(text)) return "40";
    if (/\bWomen\b/.test(text)) return "55";
    if (text.includes("Reading spectacles given")) return "10";
    if (text.includes("+1.0")) return "10";
    return null;
  };

  async function runReport(t: ReturnType<typeof waSetup>, from: string) {
    await t.tap(from, "lang:en");
    let replies = await t.tap(from, "m:report");
    expect(rowIds(replies)).toContain(`ev:${EVENT.eyeMayurCamp}`);
    replies = await t.tap(from, `ev:${EVENT.eyeMayurCamp}`);
    for (let i = 0; i < 40; i++) {
      const last = replies.at(-1)!;
      if (last.buttons?.some((b) => b.id === "c:yes")) return replies;
      const a = answerFor(last.text);
      replies = a === null ? (last.buttons?.some((b) => b.id === "skip") ? await t.tap(from, "skip") : await t.say(from, "0")) : await t.say(from, a);
    }
    throw new Error("report flow did not reach the summary");
  }

  it("asks one number at a time, checks the form's rules, then submits with source whatsapp", async () => {
    const t = waSetup();
    const from = phone(1);
    const summary = await runReport(t, from);
    expect(summary.at(-1)!.text).toContain("Registered and screened: 100");
    const sent = await t.tap(from, "c:yes");
    expect(texts(sent)).toContain("East");
    const subs = await t.repo.portal.submissionsForEvent(EVENT.eyeMayurCamp);
    expect(subs).toHaveLength(1);
    expect(subs[0].source).toBe("whatsapp");
    expect(subs[0].answers).toMatchObject({ registered: 100, male: 40, female: 55, spectacles_total: 10 });
    expect((await t.repo.eventById(EVENT.eyeMayurCamp))?.status).toBe("report_submitted");
    // the district is told, like for a form submission
    expect(t.whatsapp.sent.some((s) => s.template === "report_approval_request" && s.to === phone(2))).toBe(true);
    const facts = await t.repo.portal.factsForEvents([EVENT.eyeMayurCamp]);
    expect(facts.find((f) => f.kpiKey === "eye.screened")?.value).toBe(100);
  });

  it("rejects non-numbers and out-of-range numbers and keeps the question", async () => {
    const t = waSetup();
    const from = phone(1);
    await t.tap(from, "lang:en");
    await t.tap(from, "m:report");
    const q = await t.tap(from, `ev:${EVENT.eyeMayurCamp}`);
    expect(q.at(-1)!.text).toMatch(/1\/\d+/);
    expect(texts(await t.say(from, "about fifty"))).toContain("whole number");
    expect(texts(await t.say(from, "-5"))).toContain("whole number");
    expect(texts(await t.say(from, "99999"))).toContain("whole number"); // volunteers are capped at 1000
  });

  it("acknowledges a register photo mid-report and keeps it private", async () => {
    const t = waSetup();
    const from = phone(1);
    await t.tap(from, "lang:en");
    await t.tap(from, "m:report");
    await t.tap(from, `ev:${EVENT.eyeMayurCamp}`);
    const reply = await t.say(from, null, null, { kind: "image", name: "register.jpg" });
    expect(reply[0].text).toBe(pick("en", COPY.reportPhoto));
    expect(reply.at(-1)!.text).toMatch(/1\/\d+/); // the question is asked again
  });

  it("goes back to the start on Edit and drops nothing on Cancel", async () => {
    const t = waSetup();
    const from = phone(1);
    await runReport(t, from);
    const again = await t.tap(from, "c:edit");
    expect(again.at(-1)!.text).toMatch(/1\/\d+/);
    await runReport(t, from).catch(() => undefined);
    const cancelled = await t.say(from, "cancel");
    expect(texts(cancelled)).toContain(pick("en", COPY.cancelled));
    expect(await t.repo.portal.submissionsForEvent(EVENT.eyeMayurCamp)).toHaveLength(0);
  });
});

describe("errors, timeout and hand-off", () => {
  it("drops a stale flow after 30 minutes with 'let's start again'", async () => {
    const t = waSetup();
    const from = phone(2);
    await t.tap(from, "m:plan");
    await t.tap(from, "seva:eye");
    t.advance(31 * 60 * 1000);
    const reply = await t.say(from, "Laxmi Nagar");
    expect(reply[0].text).toBe(pick("en", COPY.timeout));
    expect(rowIds(reply)).toContain("m:plan");
    // a flow answered in time is kept
    t.advance(60_000);
    await t.tap(from, "m:plan");
    t.advance(10 * 60 * 1000);
    expect(texts(await t.tap(from, "seva:eye"))).toBe(pick("en", COPY.planSamithi));
  });

  it("says it did not understand, then offers a person, who lands in the inbox", async () => {
    const t = waSetup();
    await t.tap(PUBLIC_PHONE, "lang:en");
    const one = await t.say(PUBLIC_PHONE, "blah");
    expect(one[0].text).toBe(pick("en", COPY.unrecognised));
    const two = await t.say(PUBLIC_PHONE, "blah blah");
    expect(buttonIds(two)).toEqual(["h:human", "m:menu"]);
    const before = (await t.repo.wa.inboxCounts({})).for_me;
    const handoff = await t.tap(PUBLIC_PHONE, "h:human");
    expect(texts(handoff)).toBe(pick("en", COPY.handoff));
    expect((await t.repo.wa.inboxCounts({})).for_me).toBe(before + 1);
  });

  it("sends coordinators' free text and photos to review instead of guessing", async () => {
    const t = waSetup();
    const before = await t.repo.wa.listInbox({ state: "for_me" });
    const reply = await t.say(phone(1), "Eye camp kal, 120 log aaye, 80 chashme diye");
    expect(texts(reply)).toBe(pick("hi", COPY.sentToReview));
    const after = await t.repo.wa.listInbox({ state: "for_me" });
    expect(after.total).toBe(before.total + 1);
    const item = after.rows.find((i) => !before.rows.some((b) => b.id === i.id))!;
    expect(item.eventId).toBe(EVENT.eyeMayurCamp);
    expect(item.draftAnswers).toMatchObject({ registered: 120, spectacles_total: 80 });
    // photos start the gallery flow (tests/gallery-intake.test.ts); a PDF still goes to review
    const photo = await t.say(phone(1), null, null, { kind: "image", name: "page.jpg" });
    expect(texts(photo)).toBe(pick("hi", COPY.galleryNoBytes));
    const pdf = await t.say(phone(1), null, null, { kind: "pdf", name: "page.pdf" });
    expect(texts(pdf)).toBe(pick("hi", COPY.sentToReview));
  });

  it("stops updates on STOP, even in the middle of a flow", async () => {
    const t = waSetup();
    await t.tap(PUBLIC_PHONE, "lang:en");
    await t.tap(PUBLIC_PHONE, "m:join");
    expect(texts(await t.say(PUBLIC_PHONE, "STOP"))).toBe(pick("en", COPY.optOutDone));
  });
});

describe("public flows", () => {
  it("shows what's on near me for a district or pincode, with links", async () => {
    const t = waSetup();
    await t.tap(PUBLIC_PHONE, "lang:en");
    await t.tap(PUBLIC_PHONE, "m:near");
    const byName = await t.say(PUBLIC_PHONE, "East");
    expect(byName[0].text).toContain("/events/");
    expect(byName[0].text.split("•").length - 1).toBeLessThanOrEqual(5);
    await t.tap(PUBLIC_PHONE, "m:near");
    const byPin = await t.say(PUBLIC_PHONE, "110091");
    expect(byPin[0].text).toContain("Coming up in");
    await t.tap(PUBLIC_PHONE, "m:near");
    expect(texts(await t.say(PUBLIC_PHONE, "zzzz"))).toBe(pick("en", COPY.nearUnknown));
  });

  it("resolves a known NCR pincode no centre lists (122003) instead of 'couldn't match'", async () => {
    const t = waSetup();
    await t.tap(PUBLIC_PHONE, "lang:en");
    await t.tap(PUBLIC_PHONE, "m:near");
    const out = texts(await t.say(PUBLIC_PHONE, "122003"));
    expect(out).not.toContain(pick("en", COPY.nearUnknown));
  });

  it("joins updates in chat and records consent; shares a centre's number", async () => {
    const t = waSetup();
    await t.tap(PUBLIC_PHONE, "lang:en");
    await t.tap(PUBLIC_PHONE, "m:join");
    await t.tap(PUBLIC_PHONE, "c:yes");
    expect(texts(await t.say(PUBLIC_PHONE, "East"))).toContain(pick("en", COPY.joinDone));
    expect(await t.repo.wa.optedInCount()).toBeGreaterThan(10);
    await t.tap(PUBLIC_PHONE, "m:contact");
    const centres = await t.say(PUBLIC_PHONE, "Mayur Vihar");
    expect(centres[0].text).toContain("Sai Centre Mayur Vihar");
  });

  it("lists a coordinator's latest activities with their status", async () => {
    const t = waSetup();
    const reply = await t.tap(phone(1), "m:events");
    expect(reply[0].text).toContain("•");
  });
});
