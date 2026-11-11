// Optional YouTube video on articles (v0.10.5): URL parser, save, public DTO.
import { describe, expect, it } from "vitest";
import { parseYouTubeId, youTubeThumb } from "@/contract";
import { USER } from "@/server/mock/fixtures";
import { errCode, m6Setup } from "./support/m6";

const ID = "dQw4w9WgXcQ";

describe("parseYouTubeId", () => {
  it.each([
    ID,
    `https://www.youtube.com/watch?v=${ID}`,
    `https://www.youtube.com/watch?v=${ID}&t=30s`,
    `https://youtube.com/watch?feature=share&v=${ID}`,
    `https://m.youtube.com/watch?v=${ID}`,
    `https://youtu.be/${ID}`,
    `youtu.be/${ID}?si=abc`,
    `https://www.youtube.com/shorts/${ID}`,
    `https://www.youtube.com/embed/${ID}`,
    `https://www.youtube-nocookie.com/embed/${ID}?rel=0`,
    `https://www.youtube.com/live/${ID}`,
    `  ${ID}  `,
  ])("accepts %s", (input) => expect(parseYouTubeId(input)).toBe(ID));

  it.each(["", "   ", null, undefined, "abc", "not a url", "https://vimeo.com/123456789", `https://evil.com/watch?v=${ID}`, "https://www.youtube.com/watch?v=short", "https://www.youtube.com/", "https://www.youtube.com/channel/UC12345678901"])("rejects %s", (input) =>
    expect(parseYouTubeId(input as string)).toBeNull(),
  );

  it("builds thumbnail url", () => expect(youTubeThumb(ID)).toBe(`https://i.ytimg.com/vi/${ID}/hqdefault.jpg`));
});

describe("article video", () => {
  const body = (extra: object = {}) => ({ kind: "article" as const, category: "golden-stories", title: { en: "Episode 1", hi: null }, bodyHtml: { en: "<p>Story.</p>", hi: null }, ...extra }) as never;

  it("saves, serves in the public DTO, home story falls back to thumbnail, and clears", async () => {
    const t = m6Setup();
    const ed = await t.actor(USER.contentD);
    const a = await t.svc.portal.content.create(ed, body({ video: `https://youtu.be/${ID}` }));
    if (a.kind !== "article") throw new Error("article");
    expect(a.video).toEqual({ provider: "youtube", id: ID, url: `https://www.youtube.com/watch?v=${ID}` });
    const p = await t.svc.portal.content.patch(ed, a.id, { status: "published", version: a.version });
    if (p.kind !== "article") throw new Error("article");

    const pub = await t.svc.articles.bySlug(a.slug);
    expect(pub?.video).toEqual({ provider: "youtube", id: ID, url: `https://www.youtube.com/watch?v=${ID}` });
    const stories = await t.svc.articles.goldenStories("en", 5);
    expect(stories[0]?.image?.url).toBe(youTubeThumb(ID));

    const bad = t.svc.portal.content.patch(ed, a.id, { video: "https://vimeo.com/1", version: p.version });
    expect(await errCode(bad)).toBe("VALIDATION_FAILED");

    const cleared = await t.svc.portal.content.patch(ed, a.id, { video: "", version: p.version });
    if (cleared.kind !== "article") throw new Error("article");
    expect(cleared.video).toBeNull();
    expect((await t.svc.articles.bySlug(a.slug))?.video).toBeNull();
  });

  it("no video -> null; legacy side-table video id reaches the public DTO", async () => {
    const t = m6Setup();
    const pub = await t.svc.articles.bySlug("a-day-at-narayan-seva");
    expect(pub?.video?.id).toBe(ID);
    const other = await t.svc.articles.bySlug("new-website-launch");
    expect(other?.video).toBeNull();
  });
});
