// Legacy content polish: body HTML cleanup on legacy samples, district heuristic, hidden category.
import { describe, expect, it } from "vitest";
import { rewriteLegacyMedia, sanitizeBody } from "@/server/domain/articles";
import { detectDistrict } from "@/server/domain/legacy-content";
import { loadFixtures } from "@/server/mock/fixtures";
import { MockRepo } from "@/server/repo/mock";
import { createServices } from "@/server/services/create";
import { NOW } from "./support/services";

describe("legacy body HTML", () => {
  it("rewrites absolute and relative media URLs to /media", () => {
    const html = sanitizeBody(
      '<p><img src="https://www.saidelhi.org/media/uploads/a.jpg" style="width:300px" class="x"></p>' +
        '<p><img src="media/uploads/b.jpg" width="200" height="100"></p>' +
        '<p><img src="../media/uploads/c.jpg"></p>' +
        '<p><a href="http://saidelhi.org/media/docs/report.pdf">Report</a> <a href="https://example.org/x">Other</a></p>',
    );
    expect(html).toContain('src="/media/uploads/a.jpg"');
    expect(html).toContain('src="/media/uploads/b.jpg"');
    expect(html).toContain('src="/media/uploads/c.jpg"');
    expect(html).toContain('href="/media/docs/report.pdf"');
    expect(html).toContain('href="https://example.org/x"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).not.toContain("style=");
    expect(html).not.toContain("class=");
  });

  it("honours a custom media base and leaves other URLs alone", () => {
    expect(rewriteLegacyMedia("https://saidelhi.org/media/x.jpg", "https://cdn.test/m")).toBe("https://cdn.test/m/x.jpg");
    expect(rewriteLegacyMedia("https://other.org/media/x.jpg", "/media")).toBe("https://other.org/media/x.jpg");
    expect(rewriteLegacyMedia("/news/foo", "/media")).toBe("/news/foo");
    expect(rewriteLegacyMedia(undefined, "/media")).toBeUndefined();
  });

  it("drops empty CKEditor paragraphs but keeps image-only ones", () => {
    const html = sanitizeBody('<p>&nbsp;</p><p><br></p><p>   </p><p>Text</p><p><img src="/media/a.jpg" alt=""></p>');
    expect(html.match(/<p>/g)).toHaveLength(2);
    expect(html).toContain("Text");
    expect(html).toContain("<img");
  });
});

describe("district tagging heuristic", () => {
  it("matches names and localities, badge first", () => {
    expect(detectDistrict("Gurugram", "Anything")).toBe("gurugram");
    expect(detectDistrict(null, "Eye camp held in Mayur Vihar")).toBe("east");
    expect(detectDistrict("", "Free medical camp at Dwarka, New Delhi")).toBe("west");
    expect(detectDistrict(null, "Gurgaon youth meet")).toBe("gurugram");
    expect(detectDistrict("Noida", "Blood donation, Gurugram")).toBe("noida-ghaziabad");
    expect(detectDistrict(null, "Greater Noida and Ghaziabad service")).toBe("noida-ghaziabad");
  });

  it("leaves vague or ambiguous posts untagged", () => {
    expect(detectDistrict(null, "Celebrating the Centenary")).toBeNull();
    expect(detectDistrict(null, "South India pilgrimage")).toBeNull();
    expect(detectDistrict("Noida, Gurugram", "x")).toBeNull();
    expect(detectDistrict(null, null)).toBeNull();
  });
});

describe("hidden legacy category", () => {
  it("never lists or serves category O posts", async () => {
    const fx = loadFixtures();
    fx.articles.push({ ...fx.articles[0], id: 777001, slug: "hidden-o-post", category: "O", i18n: null });
    const repo = new MockRepo(fx);
    const svc = createServices(repo, { now: () => NOW, mediaBase: "/media" });
    const all = await svc.articles.list({ c: "all", page: 1, pageSize: 100 });
    expect(all.data.some((a) => a.slug === "hidden-o-post")).toBe(false);
    expect(await svc.articles.bySlug("hidden-o-post")).toBeNull();
    expect(await svc.articles.exists("hidden-o-post")).toBe(false);
  });
});
