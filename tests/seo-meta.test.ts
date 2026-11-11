import { describe, expect, it } from "vitest";
import { metaDescription, pageAlternates } from "@/features/seo/meta";
import { localeUrl } from "@/features/seo/schema";

describe("pageAlternates", () => {
  it("points English pages at themselves with a Hindi twin", () => {
    expect(pageAlternates("en", "/about")).toEqual({
      canonical: "/about",
      languages: { en: "/about", hi: "/hi/about", "x-default": "/about" },
    });
  });

  it("uses the /hi path as canonical on Hindi pages and handles the home page", () => {
    expect(pageAlternates("hi", "/")).toEqual({ canonical: "/hi", languages: { en: "/", hi: "/hi", "x-default": "/" } });
  });
});

describe("metaDescription", () => {
  it("returns undefined for empty text so the layout default applies", () => {
    expect(metaDescription("  ")).toBeUndefined();
    expect(metaDescription(null)).toBeUndefined();
  });

  it("collapses whitespace and strips tags", () => {
    expect(metaDescription("<p>Free  eye\ncamp</p>")).toBe("Free eye camp");
  });

  it("cuts long text at a word boundary within the limit", () => {
    const out = metaDescription("word ".repeat(80))!;
    expect(out.length).toBeLessThanOrEqual(160);
    expect(out.endsWith("word…")).toBe(true);
  });
});

describe("localeUrl", () => {
  it("prefixes Hindi and keeps English unprefixed", () => {
    expect(localeUrl("https://saidelhi.org/", "en", "/news/a")).toBe("https://saidelhi.org/news/a");
    expect(localeUrl("https://saidelhi.org", "hi", "/")).toBe("https://saidelhi.org/hi");
  });
});
