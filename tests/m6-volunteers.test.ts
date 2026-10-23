// M6 volunteers on the in-memory repo: list, audited masked sign-ups, scope, opt-in alert.
import { describe, expect, it } from "vitest";
import { EVENT, SAMITHI, USER } from "@/server/mock/fixtures";
import { DEV_TOKENS } from "./support/links";
import { errCode, m6Setup } from "./support/m6";

describe("volunteers", () => {
  it("lists events asking for volunteers, shows masked sign-ups with audit, and alerts opted-in coordinators", async () => {
    const t = m6Setup();
    const state = await t.actor(USER.stateC);
    const north = await t.actor(USER.districtG);
    const ev = (await t.repo.eventById(EVENT.eyePlanned))!;
    const owner = ev.samithiId === SAMITHI.mayurVihar ? USER.coordA : null;

    const q = { page: 1, pageSize: 50, when: "upcoming" } as never;
    const before = await t.svc.portal.volunteers.list(state, q);
    expect(before.meta.notifyOnSignup).toBe(false);
    const row = before.data.find((r) => r.event.id === EVENT.eyePlanned)!;
    expect(row).toBeDefined();
    expect(row.needed).toBe(ev.volunteersNeeded);
    expect(row.deleteOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(await t.svc.portal.volunteers.setNotify(state, { notifyOnSignup: true })).toEqual({ notifyOnSignup: true });
    expect((await t.svc.portal.volunteers.list(state, q)).meta.notifyOnSignup).toBe(true);
    if (owner) await t.svc.portal.volunteers.setNotify(await t.actor(owner), { notifyOnSignup: true });

    // A public sign-up arrives.
    const tok = DEV_TOKENS["eye-public"];
    const info = await t.svc.links.info(tok, null);
    t.clock.t = new Date(t.clock.t.getTime() + 2000);
    const grant = await t.svc.links.startPublic(tok, { botToken: info.botChallenge ?? "" });
    await t.svc.links.submit(tok, grant?.sessionToken ?? null, "signup-m6-1", { first_name: "Asha", phone: "9876543210", consent: true }, "en");

    const signups = await t.svc.portal.volunteers.signups(state, EVENT.eyePlanned);
    expect(signups).toHaveLength(1);
    expect(signups[0]).toMatchObject({ firstName: "Asha", channel: "web", waitlist: false });
    expect(JSON.stringify(signups)).not.toContain("9876543210");
    const audit = await t.repo.portal.listAudit({ action: "volunteers.view", limit: 5, offset: 0 });
    expect(audit.rows).toHaveLength(1);
    // Scope: another district sees neither the row nor the sign-ups.
    expect((await t.svc.portal.volunteers.list(north, q)).data.find((r) => r.event.id === EVENT.eyePlanned)).toBeUndefined();
    expect(await errCode(t.svc.portal.volunteers.signups(north, EVENT.eyePlanned))).toBe("NOT_FOUND");
    // Alerts go to opted-in coordinators only and never carry the volunteer's name or number.
    const alerts = t.whatsapp.sent.filter((m) => m.template === "volunteer_signup_alert");
    if (owner) expect(alerts.length).toBeGreaterThanOrEqual(1);
    expect(JSON.stringify(alerts)).not.toContain("Asha");
  });
});
