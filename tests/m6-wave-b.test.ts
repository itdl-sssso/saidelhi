// M6 wave B on the in-memory repo.
import { describe, expect, it } from "vitest";
import { DISTRICT, USER } from "@/server/mock/fixtures";
import { errCode, m6Setup } from "./support/m6";

describe("impact controls", () => {
  it("keeps current Home tiles by default and honours toggles", async () => {
    const t = m6Setup();
    const content = await t.actor(USER.contentD);
    const before = await t.svc.home.get();
    const keysBefore = before.kpis?.map((k) => k.key);
    if (keysBefore) expect(keysBefore).toEqual(["activities", "people_served", "blood.units", "eye.spectacles"]);

    const ctl = await t.svc.portal.impact.get(content);
    expect(ctl.kpis.filter((k) => k.homeTile).map((k) => k.key).sort()).toEqual(["activities", "people_served", "blood.units", "eye.spectacles"].sort());

    // Hide volunteer hours on /impact, swap a Home tile.
    const out = await t.svc.portal.impact.patch(content, {
      version: ctl.version,
      kpis: [
        { key: "volunteer_hours", publicImpact: false, homeTile: false },
        { key: "eye.spectacles", publicImpact: true, homeTile: false },
        { key: "blood.donors", publicImpact: true, homeTile: true },
      ],
    });
    expect(out.version).toBe(ctl.version + 1);
    const impact = await t.svc.impact.get({ period: "all" } as never);
    expect(impact?.tiles.map((x) => x.key)).not.toContain("volunteer_hours");
    const home = await t.svc.home.get();
    if (home.kpis) expect(home.kpis.map((k) => k.key)).toContain("blood.donors");

    expect(await errCode(t.svc.portal.impact.patch(content, { version: ctl.version, showEstimates: false }))).toBe("CONFLICT");
    const five = ["eye.screened", "eye.cataract_surgeries"].map((key) => ({ key, publicImpact: true, homeTile: true }));
    expect(await errCode(t.svc.portal.impact.patch(content, { version: out.version, kpis: five }))).toBe("VALIDATION_FAILED");
  });

  it("estimates CRUD is audited and excluded when switched off", async () => {
    const t = m6Setup();
    const content = await t.actor(USER.contentD);
    const row = await t.svc.portal.impact.estimates.create(content, { districtId: DISTRICT.north, year: 2019, kpiKey: "activities", value: 40, source: "District register" });
    expect(row).toMatchObject({ year: 2019, month: null, value: 40, enteredBy: expect.any(String) });
    expect(await errCode(t.svc.portal.impact.estimates.create(content, { districtId: DISTRICT.north, year: 2099, kpiKey: "activities", value: 1, source: "x" }))).toBe("VALIDATION_FAILED");
    const patched = await t.svc.portal.impact.estimates.patch(content, row.id, { value: 55 });
    expect(patched.value).toBe(55);
    const list = await t.svc.portal.impact.estimates.list(content, { page: 1, pageSize: 50, year: 2019 });
    expect(list.data.map((r) => r.id)).toContain(row.id);
    const ctl = await t.svc.portal.impact.get(content);
    await t.svc.portal.impact.patch(content, { version: ctl.version, showEstimates: false });
    const all = await t.svc.impact.get({ period: "all" } as never);
    expect(all?.tiles.find((x) => x.key === "activities")?.figure.estimate).toBe(false);
    await t.svc.portal.impact.estimates.remove(content, row.id);
    expect((await t.svc.portal.impact.estimates.list(content, { page: 1, pageSize: 50, year: 2019 })).data.map((r) => r.id)).not.toContain(row.id);
    const audit = await t.repo.portal.listAudit({ limit: 50, offset: 0 });
    expect(audit.rows.map((r) => r.action)).toEqual(expect.arrayContaining(["impact.estimate.create", "impact.estimate.update", "impact.estimate.delete", "impact.update"]));
    expect(await errCode(t.svc.portal.impact.get(await t.actor(USER.coordA)))).toBe("FORBIDDEN");
  });
});
