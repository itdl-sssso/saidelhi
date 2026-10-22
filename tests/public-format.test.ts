import { describe, expect, it } from "vitest";
import {
  activeFilterCount,
  calendarQuery,
  groupByDay,
  monthBounds,
  monthGrid,
  parseCalendarParams,
  shiftMonth,
} from "@/features/calendar/model";
import type { EventPublic } from "@/contract";
import {
  formatDate,
  formatDateLong,
  formatIsoDate,
  formatPeriodRange,
  formatTime,
  formatTimeRange,
  istDateKey,
  pickText,
} from "@/lib/format";

describe("public formatting (IST)", () => {
  // 17 Oct 2026, 9:00 AM IST = 03:30 UTC
  const at = "2026-10-17T03:30:00.000Z";

  it("formats dates as 17 Oct 2026 / 17 अक्टूबर 2026", () => {
    expect(formatDate(at, "en")).toBe("17 Oct 2026");
    expect(formatDate(at, "hi")).toBe("17 अक्टूबर 2026");
    expect(formatIsoDate("2026-01-05", "en")).toBe("5 Jan 2026");
    expect(formatDateLong(at, "en")).toBe("Saturday, 17 Oct 2026");
  });

  it("formats times as 5:30 PM with IST conversion", () => {
    expect(formatTime(at, "en")).toBe("9:00 AM");
    expect(formatTime("17:30", "en")).toBe("5:30 PM");
    expect(formatTime("00:05", "en")).toBe("12:05 AM");
    expect(formatTime("18:30", "hi")).toBe("शाम 6:30");
    expect(formatTimeRange(at, "2026-10-17T08:30:00.000Z", "en")).toBe("9:00 AM – 2:00 PM");
  });

  it("uses the IST calendar day near midnight UTC", () => {
    expect(istDateKey("2026-10-17T19:00:00.000Z")).toBe("2026-10-18");
  });

  it("formats period ranges", () => {
    expect(formatPeriodRange("2026-01-01", "2026-10-22", "en", (d) => `Up to ${d}`)).toBe("1 Jan – 22 Oct 2026");
    expect(formatPeriodRange(null, "2026-10-22", "en", (d) => `Up to ${d}`)).toBe("Up to 22 Oct 2026");
  });

  it("falls back to English when Hindi is missing", () => {
    expect(pickText({ en: "Eye camp", hi: null }, "hi")).toEqual({ text: "Eye camp", lang: "en", fallback: true });
    expect(pickText({ en: "Eye camp", hi: "नेत्र शिविर" }, "hi").text).toBe("नेत्र शिविर");
  });
});

describe("calendar model", () => {
  const today = "2026-10-22";

  it("parses URL params with safe defaults", () => {
    const s = parseCalendarParams({ view: "month", month: "2026-13", sevaType: "nope", district: "East!", volunteers: "1" }, today);
    expect(s).toMatchObject({ view: "month", month: "2026-10", sevaType: null, district: null, volunteers: true, page: 1 });
    expect(parseCalendarParams({ district: "east", sevaType: "eye", page: "3" }, today)).toMatchObject({
      view: "list",
      district: "east",
      sevaType: "eye",
      page: 3,
    });
  });

  it("round-trips state to a short query", () => {
    const s = parseCalendarParams({ view: "month", month: "2026-11", samithi: "saket" }, today);
    expect(calendarQuery(s, today)).toEqual({ view: "month", month: "2026-11", samithi: "saket" });
    expect(calendarQuery(parseCalendarParams({}, today), today)).toEqual({});
    expect(activeFilterCount(s)).toBe(1);
  });

  it("builds Monday-first month grids", () => {
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(monthBounds("2026-02")).toEqual({ from: "2026-02-01", to: "2026-02-28" });
    const grid = monthGrid("2026-10"); // 1 Oct 2026 is a Thursday
    expect(grid.length % 7).toBe(0);
    expect(grid[0]).toEqual({ key: "2026-09-28", day: 28, inMonth: false });
    expect(grid[3]).toEqual({ key: "2026-10-01", day: 1, inMonth: true });
    expect(grid.filter((c) => c.inMonth)).toHaveLength(31);
  });

  it("groups events by IST day in start order", () => {
    const ev = (id: string, startsAt: string) => ({ id, startsAt }) as EventPublic;
    const groups = groupByDay([ev("b", "2026-10-17T10:00:00.000Z"), ev("a", "2026-10-17T03:30:00.000Z"), ev("c", "2026-10-17T19:00:00.000Z")]);
    expect([...groups.keys()]).toEqual(["2026-10-17", "2026-10-18"]);
    expect(groups.get("2026-10-17")!.map((e) => e.id)).toEqual(["a", "b"]);
  });
});
