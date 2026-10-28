// Admin-managed article types (v0.10) on the in-memory repo.
import { describe, expect, it } from "vitest";
import { USER } from "@/server/mock/fixtures";
import { errCode, m6Setup } from "./support/m6";

const article = (category: string, title = "Golden one") => ({ kind: "article" as const, category, title: { en: title, hi: null }, bodyHtml: { en: "<p>A story.</p>", hi: null } }) as never;

describe("content types", () => {
  it("serves the defaults, state admin only may change them, all audited", async () => {
    const t = m6Setup();
    const admin = await t.actor(USER.stateC);
    const editor = await t.actor(USER.contentD);
    const list = await t.svc.portal.contentTypes.list(editor);
    expect(list.map((r) => r.slug)).toEqual(expect.arrayContaining(["news", "stories", "golden-stories", "seva-report", "announcement"]));
    expect(list.find((r) => r.slug === "news")).toMatchObject({ builtin: true, active: true });
    expect(await errCode(t.svc.portal.contentTypes.create(editor, { labelEn: "Poems", labelHi: null }))).toBe("FORBIDDEN");

    const added = await t.svc.portal.contentTypes.create(admin, { labelEn: "Poems", labelHi: "कविताएँ" });
    expect(added).toMatchObject({ slug: "poems", builtin: false, active: true, version: 1 });
    expect(await errCode(t.svc.portal.contentTypes.create(admin, { labelEn: "poems", labelHi: null }))).toBe("VALIDATION_FAILED");

    const renamed = await t.svc.portal.contentTypes.patch(admin, "poems", { labelEn: "Poetry", version: added.version });
    expect(renamed.labelEn).toBe("Poetry");
    expect(await errCode(t.svc.portal.contentTypes.patch(admin, "poems", { labelEn: "X1", version: added.version }))).toBe("CONFLICT");

    const order = (await t.svc.portal.contentTypes.list(admin)).map((r) => r.slug);
    const moved = await t.svc.portal.contentTypes.reorder(admin, { slugs: ["poems", ...order.filter((s) => s !== "poems")] });
    expect(moved[0].slug).toBe("poems");
    expect(await errCode(t.svc.portal.contentTypes.reorder(admin, { slugs: ["nope"] }))).toBe("VALIDATION_FAILED");

    const audit = await t.repo.portal.listAudit({ limit: 50, offset: 0 });
    expect(audit.rows.map((r) => r.action)).toEqual(expect.arrayContaining(["content_type.create", "content_type.update", "content_type.reorder"]));
  });

  it("editor can only pick active types; a custom type's article is public with its label", async () => {
    const t = m6Setup();
    const admin = await t.actor(USER.stateC);
    const ed = await t.actor(USER.contentD);
    expect(await errCode(t.svc.portal.content.create(ed, article("no-such-type")))).toBe("VALIDATION_FAILED");
    const a = await t.svc.portal.content.create(ed, article("golden-stories"));
    if (a.kind !== "article") throw new Error("article");
    expect(a.category).toBe("golden-stories");
    await t.svc.portal.content.patch(ed, a.id, { status: "published", version: a.version });

    const pub = await t.svc.articles.bySlug(a.slug);
    expect(pub).toMatchObject({ category: "news", type: { slug: "golden-stories", label: { en: "Golden Stories" } } });
    const stories = await t.svc.articles.goldenStories("en", 5);
    expect(stories[0]).toMatchObject({ title: "Golden one", href: `/news/${a.slug}` });
    expect((await t.svc.articles.list({ c: "golden-stories", page: 1, pageSize: 10 } as never)).data.map((x) => x.slug)).toContain(a.slug);

    const gs = (await t.svc.portal.contentTypes.list(admin)).find((r) => r.slug === "golden-stories")!;
    await t.svc.portal.contentTypes.patch(admin, "golden-stories", { active: false, version: gs.version });
    expect(await errCode(t.svc.portal.content.create(ed, article("golden-stories", "Another")))).toBe("VALIDATION_FAILED");
    // Existing article stays public.
    expect(await t.svc.articles.exists(a.slug)).toBe(true);
  });
});
