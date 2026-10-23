import { describe, expect, it } from "vitest";
import { directionsUrl, formatKm, parseSearch } from "@/features/map/model";

describe("map model (spec 12)", () => {
  it("directions use coordinates when known, else the address", () => {
    expect(directionsUrl({ address: "Sector 50, Noida", geo: { lat: 28.57, lng: 77.36 } })).toBe(
      "https://www.google.com/maps/dir/?api=1&destination=28.57%2C77.36",
    );
    expect(directionsUrl({ address: "Sector 50, Noida", geo: null })).toBe(
      "https://www.google.com/maps/dir/?api=1&destination=Sector%2050%2C%20Noida",
    );
  });

  it("a 6-digit search is a pincode, anything else a locality", () => {
    expect(parseSearch("110091")).toEqual({ pincode: "110091" });
    expect(parseSearch(" 110091 ")).toEqual({ pincode: "110091" });
    expect(parseSearch("Mayur Vihar")).toEqual({ q: "Mayur Vihar" });
    expect(parseSearch("1100")).toEqual({ q: "1100" });
    expect(parseSearch("")).toEqual({});
    expect(parseSearch(undefined)).toEqual({});
    expect(parseSearch("x".repeat(200))?.q).toHaveLength(80);
  });

  it("distance shows one decimal, or nothing when unknown", () => {
    expect(formatKm(1.24, "en")).toBe("1.2 km");
    expect(formatKm(7, "hi")).toBe("7.0 km");
    expect(formatKm(null, "en")).toBeNull();
  });
});
