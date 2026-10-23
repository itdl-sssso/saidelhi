import { describe, expect, it } from "vitest";
import {
  ArticlesQuery,
  ERROR_HTTP_STATUS,
  ErrorCode,
  ErrorEnvelope,
  EventPublic,
  EventsQuery,
  Figure,
  FormField,
  I18nText,
  ImpactQuery,
  LEGACY_ARTICLE_CATEGORY,
  ArticleCategory,
  ListEnvelope,
  PrivacyRequestInput,
  PublicCount,
  endpoints,
  withQuery,
} from "@/contract";
import { mockServices } from "./support/services";

describe("primitives", () => {
  it("I18nText allows hi: null but not missing", () => {
    expect(I18nText.parse({ en: "Eye camp", hi: null })).toEqual({ en: "Eye camp", hi: null });
    expect(I18nText.safeParse({ en: "Eye camp" }).success).toBe(false);
  });

  it("PublicCount is a non-negative int or { lt5: true }", () => {
    expect(PublicCount.parse(0)).toBe(0);
    expect(PublicCount.parse({ lt5: true })).toEqual({ lt5: true });
    expect(PublicCount.safeParse(-1).success).toBe(false);
    expect(PublicCount.safeParse(1.5).success).toBe(false);
    expect(PublicCount.safeParse({ lt5: false }).success).toBe(false);
  });

  it("Figure distinguishes null (not reported) from 0", () => {
    const notReported = Figure.parse({ value: null, estimate: false });
    const zero = Figure.parse({ value: 0, estimate: false });
    expect(notReported.value).toBeNull();
    expect(zero.value).toBe(0);
  });
});

describe("enums", () => {
  it("legacy article letters map onto every ArticleCategory exactly once", () => {
    expect(Object.keys(LEGACY_ARTICLE_CATEGORY)).toEqual(["N", "A", "C", "D", "K", "S", "P"]);
    expect(new Set(Object.values(LEGACY_ARTICLE_CATEGORY))).toEqual(new Set(ArticleCategory.options));
  });

  it("every error code has an HTTP status", () => {
    for (const code of ErrorCode.options) expect(ERROR_HTTP_STATUS[code]).toBeGreaterThanOrEqual(400);
    expect(ERROR_HTTP_STATUS.VALIDATION_FAILED).toBe(422);
    expect(ERROR_HTTP_STATUS.LINK_USED_UP).toBe(410);
  });
});

describe("query schemas", () => {
  it("EventsQuery coerces URLSearchParams strings and drops blanks", () => {
    const q = EventsQuery.parse({ page: "2", pageSize: "10", needsVolunteers: "true", district: "", sevaType: "eye" });
    expect(q).toEqual({ page: 2, pageSize: 10, needsVolunteers: true, sevaType: "eye" });
    expect(EventsQuery.parse({})).toEqual({ page: 1, pageSize: 25 });
    expect(EventsQuery.safeParse({ pageSize: "101" }).success).toBe(false);
    expect(EventsQuery.safeParse({ from: "17-10-2026" }).success).toBe(false);
  });

  it("ImpactQuery and ArticlesQuery have defaults", () => {
    expect(ImpactQuery.parse({})).toEqual({ period: "this_year" });
    expect(ArticlesQuery.parse({ c: "centenary" })).toEqual({ c: "centenary", page: 1, pageSize: 12 });
    expect(ArticlesQuery.safeParse({ c: "X" }).success).toBe(false);
  });

  it("PrivacyRequestInput validates phone and type", () => {
    const ok = PrivacyRequestInput.parse({ name: " A ", phone: "+91 90000 00000", type: "access" });
    expect(ok).toMatchObject({ name: "A", details: "" });
    expect(PrivacyRequestInput.safeParse({ name: "A", phone: "12", type: "access" }).success).toBe(false);
    expect(PrivacyRequestInput.safeParse({ name: "A", phone: "9000000000", type: "aadhaar" }).success).toBe(false);
  });
});

describe("DTO round-trips", () => {
  it("EventPublic from the mock service survives parse → JSON → parse", async () => {
    const { svc } = mockServices();
    const page = await svc.events.list({ page: 1, pageSize: 25, from: "2025-01-01" });
    expect(page.data.length).toBeGreaterThan(0);
    for (const e of page.data) {
      const json = JSON.parse(JSON.stringify(EventPublic.parse(e)));
      expect(EventPublic.parse(json)).toEqual(e);
    }
  });

  it("FormField is recursive (repeater)", () => {
    const field = {
      id: "rows",
      kind: "repeater",
      label: { en: "Spectacles", hi: "चश्मे" },
      help: null,
      required: false,
      min: null,
      max: null,
      kpi: null,
      locked: false,
      personal: false,
      fields: [{ id: "power", kind: "select", label: { en: "Power", hi: null }, help: null, required: true, min: null, max: null, kpi: "eye.spectacles_by_power", locked: true, personal: false }],
    };
    expect(FormField.parse(field)).toEqual(field);
  });

  it("envelopes", () => {
    expect(ErrorEnvelope.parse({ error: { code: "RATE_LIMITED", message: "x", retryAfter: 30 } }).error.retryAfter).toBe(30);
    expect(ListEnvelope(I18nText).parse({ data: [], meta: { page: 1, pageSize: 25, total: 0 } }).meta.total).toBe(0);
  });
});

describe("endpoint map", () => {
  it("builds paths and skips empty query values", () => {
    expect(endpoints.health()).toBe("/api/v1/health");
    expect(endpoints.event("01ABC")).toBe("/api/v1/events/01ABC");
    expect(endpoints.events({ district: "east", needsVolunteers: true, samithi: undefined, page: 2 })).toBe(
      "/api/v1/events?district=east&needsVolunteers=true&page=2",
    );
    expect(endpoints.impact()).toBe("/api/v1/impact");
    expect(endpoints.centre("mayur vihar")).toBe("/api/v1/centres/mayur%20vihar");
    expect(endpoints.districts()).toBe("/api/v1/districts");
    expect(endpoints.centres({ pincode: "110091", q: "" })).toBe("/api/v1/centres?pincode=110091");
    expect(endpoints.join({ district: "east", sevaType: "blood", page: 2 })).toBe("/api/v1/join?district=east&sevaType=blood&page=2");
    expect(endpoints.value("sathya")).toBe("/api/v1/values/sathya");
    expect(endpoints.programs({ wing: "service" })).toBe("/api/v1/programs?wing=service");
    expect(endpoints.program("eye")).toBe("/api/v1/programs/eye");
    expect(endpoints.redirects("/about-us/")).toBe("/api/v1/redirects?path=%2Fabout-us%2F");
    expect(withQuery("/x", { a: "", b: null, c: 0 })).toBe("/x?c=0");
  });
});
