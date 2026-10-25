// M7 B2: discourse workspace (list, create, edit, review, publish) on the in-memory repo. Synthetic text only.
import { describe, expect, it } from "vitest";
import { type AdminDiscourseDetail, AdminDiscourseDetail as DetailSchema, AdminDiscoursesQuery, type DiscourseCreate, DiscourseCreate as CreateSchema } from "@/contract";
import { USER } from "@/server/mock/fixtures";
import { MockRepo } from "@/server/repo/mock";
import { createServices } from "@/server/services/create";
import { errCode } from "./support/m6";
import { NOW } from "./support/services";

const flagSet = (repo: MockRepo, on: boolean) => repo.m6.setSetting("flags", { discourses: on, offline_mode: false, ai_extraction: false }, null);

function setup() {
  const repo = new MockRepo();
  const tags: string[][] = [];
  const svc = createServices(repo, { now: () => NOW, mediaBase: "/media", revalidate: (t) => tags.push([...t]) });
  const rc = { requestId: "t", ipHash: null };
  const actor = async (id: string) => (await svc.auth.actorFor(id, rc))!;
  return { repo, svc, tags, actor };
}

const body: DiscourseCreate = CreateSchema.parse({
  title: { en: "Workspace Test Talk" },
  meta: { collPrint: "Test Vol 9", collOnline: null, date: "04 October 1970", place: "Nowhere", occasion: "Test", sourceUrl: null, pdfUrl: null, retrieved: null },
  themes: ["character"],
  why: { en: "Synthetic." },
  sourceText: "# Heading line\n\nFirst synthetic paragraph here.\n\n\nSecond synthetic paragraph, with Sample Term inside.",
});

const q = (o: object = {}) => AdminDiscoursesQuery.parse(o);

/** Fills Hindi for every block, approves each, picks two quotes. Returns the latest detail. */
async function translateAll(t: ReturnType<typeof setup>, d: AdminDiscourseDetail): Promise<AdminDiscourseDetail> {
  const tr = await t.actor(USER.translatorE);
  let cur = await t.svc.portal.discourses.patch(tr, d.id, {
    version: d.version,
    blocks: d.blocks.map((b) => ({ id: b.id, hi: `हिन्दी ${b.idx} नमूना शब्द`, status: "approved" as const })),
    quotes: [
      { en: "First synthetic paragraph", hi: null, blockId: "s2" },
      { en: "Second synthetic paragraph", hi: null, blockId: "s3" },
    ],
  });
  expect(cur.blocks.every((b) => b.status === "approved")).toBe(true);
  cur = await t.svc.portal.discourses.approve(tr, d.id, { version: cur.version });
  return cur;
}

describe("workspace RBAC", () => {
  it("coordinators out, translator in (no publish), content editor + state full", async () => {
    const t = setup();
    expect(await errCode(t.svc.portal.discourses.list(await t.actor(USER.coordA), q()))).toBe("FORBIDDEN");
    const tr = await t.actor(USER.translatorE);
    expect(tr.permissions.has("discourses.review")).toBe(true);
    expect(tr.permissions.has("discourses.publish")).toBe(false);
    expect(await errCode(t.svc.portal.discourses.list(tr, q()))).toBe("ok");
    const d = await t.svc.portal.discourses.create(tr, body);
    expect(d.can).toEqual({ edit: true, review: true, publish: false });
    expect(await errCode(t.svc.portal.discourses.publish(tr, d.id, { version: d.version }))).toBe("FORBIDDEN");
    const ed = await t.actor(USER.contentD);
    expect((await t.svc.portal.discourses.get(ed, d.id)).can.publish).toBe(true);
    expect((await t.svc.portal.discourses.get(await t.actor(USER.stateC), d.id)).can.publish).toBe(true);
  });
});

describe("list, create, glossary", () => {
  it("lists with counts, filters and searches, and creates from pasted English", async () => {
    const t = setup();
    const ed = await t.actor(USER.contentD);
    const all = await t.svc.portal.discourses.list(ed, q());
    expect(all.meta).toMatchObject({ total: 4, published: 3, flagOn: false });
    expect(all.meta.counts).toMatchObject({ all: 4, published: 3, in_review: 1, not_started: 0 });
    expect((await t.svc.portal.discourses.list(ed, q({ status: "in_review" }))).data.map((r) => r.slug)).toEqual(["sample-draft"]);
    expect((await t.svc.portal.discourses.list(ed, q({ q: "#2" }))).data.map((r) => r.slug)).toEqual(["sample-peace"]);
    expect((await t.svc.portal.discourses.list(ed, q({ theme: "habits" }))).data).toHaveLength(1);
    expect((await t.svc.portal.discourses.list(ed, q({ reviewer: "none" }))).meta.total).toBe(4);

    const d = DetailSchema.parse(await t.svc.portal.discourses.create(ed, body));
    expect(d).toMatchObject({ n: 5, slug: "workspace-test-talk", status: "not_started", version: 1 });
    expect(d.meta.isoDate).toBe("1970-10-04");
    expect(d.blocks.map((b) => [b.id, b.type, b.status, b.hi])).toEqual([
      ["s1", "heading", "empty", null],
      ["s2", "para", "empty", null],
      ["s3", "para", "empty", null],
    ]);
    expect(await errCode(t.svc.portal.discourses.create(ed, { ...body, slug: "workspace-test-talk" }))).toBe("VALIDATION_FAILED");
    expect((await t.svc.portal.discourses.glossary(ed))[0].term).toBe("Sample Term");
    expect((await t.svc.portal.discourses.get(ed, d.id)).reviewers.map((r) => r.id)).toContain(USER.translatorE);
    // audited
    const audit = await t.repo.portal.listAudit({ action: "discourse.create", limit: 50, offset: 0 });
    expect(audit.rows.length).toBe(1);
  });
});

describe("patch", () => {
  it("409 on stale version, per-block status rules, quote verbatim check, glossary issues", async () => {
    const t = setup();
    const tr = await t.actor(USER.translatorE);
    const d = await t.svc.portal.discourses.create(tr, body);

    const p1 = await t.svc.portal.discourses.patch(tr, d.id, { version: d.version, blocks: [{ id: "s3", hi: "हिन्दी पाठ" }] });
    expect(p1.version).toBe(2);
    expect(p1.blocks[2]).toMatchObject({ status: "edited", hi: "हिन्दी पाठ" });
    expect(p1.blocks[2].glossaryIssues).toEqual([{ term: "Sample Term", expected: "नमूना शब्द" }]);
    expect(await errCode(t.svc.portal.discourses.patch(tr, d.id, { version: 1, blocks: [{ id: "s3", hi: "x" }] }))).toBe("CONFLICT");

    // no Hindi → cannot approve; unknown block; blank hi resets to empty
    const bad = await t.svc.portal.discourses.patch(tr, d.id, { version: 2, blocks: [{ id: "s2", status: "approved" }] }).catch((e) => e);
    expect(bad.fields).toEqual({ "blocks.0": "Add the Hindi text before approving." });
    const unk = await t.svc.portal.discourses.patch(tr, d.id, { version: 2, blocks: [{ id: "zz", hi: "x" }] }).catch((e) => e);
    expect(Object.keys(unk.fields)).toEqual(["blocks.0"]);
    const blank = await t.svc.portal.discourses.patch(tr, d.id, { version: 2, blocks: [{ id: "s3", hi: "  " }] });
    expect(blank.blocks[2]).toMatchObject({ status: "empty", hi: null });

    // quotes must be verbatim in their block
    const q422 = await t.svc.portal.discourses
      .patch(tr, d.id, { version: 3, quotes: [{ en: "First synthetic paragraph", hi: null, blockId: "s2" }, { en: "not in the text", hi: null, blockId: "s2" }] })
      .catch((e) => e);
    expect(Object.keys(q422.fields)).toEqual(["quotes.1"]);

    // reviewer assignment: must hold discourses.review; coordinators cannot even reach the API
    const badRev = await t.svc.portal.discourses.patch(tr, d.id, { version: 3, reviewerId: USER.coordA }).catch((e) => e);
    expect(badRev.fields).toEqual({ reviewerId: "This person cannot review discourses." });
    const ok = await t.svc.portal.discourses.patch(tr, d.id, { version: 3, reviewerId: USER.contentD });
    expect(ok.reviewer?.id).toBe(USER.contentD);
  });
});

describe("ai-draft + send-review", () => {
  it("restores stored drafts into empty paragraphs; 422 when none; send-review needs a reviewer", async () => {
    const t = setup();
    const tr = await t.actor(USER.translatorE);
    const d = await t.svc.portal.discourses.create(tr, body);
    expect((await t.svc.portal.discourses.aiDraft(tr, d.id, { version: 1 }).catch((e) => e)).fields).toHaveProperty("blocks");

    // give s2 a stored AI draft
    const rec = t.repo.discourses.items.find((f) => f.rec.id === d.id)!;
    rec.blocks[1].hiAi = "एआई मसौदा";
    const r = await t.svc.portal.discourses.aiDraft(tr, d.id, { version: 1 });
    expect(r.blocks[1]).toMatchObject({ hi: "एआई मसौदा", status: "ai_draft", hasAiDraft: true });
    expect(r.status).toBe("ai_draft");

    expect((await t.svc.portal.discourses.sendReview(tr, d.id, { version: r.version }).catch((e) => e)).fields).toHaveProperty("reviewerId");
    const sent = await t.svc.portal.discourses.sendReview(tr, d.id, { version: r.version, reviewerId: USER.contentD });
    expect(sent).toMatchObject({ status: "in_review", reviewer: { id: USER.contentD } });
  });
});

describe("approve + publish", () => {
  it("blockers, snapshot isolation, republish, unpublish, revalidation, audit", async () => {
    const t = setup();
    const tr = await t.actor(USER.translatorE);
    const ed = await t.actor(USER.contentD);
    const d = await t.svc.portal.discourses.create(tr, body);

    // approve blocked: blocks not approved + no quotes
    const e1 = await t.svc.portal.discourses.approve(tr, d.id, { version: 1 }).catch((e) => e);
    expect(Object.keys(e1.fields).sort()).toEqual(["blocks", "quotes"]);

    const approved = await translateAll(t, d);
    expect(approved.status).toBe("approved");
    expect(approved.publishBlockers).toEqual(["flag_off"]);

    // flag off → 422 flag_off
    const off = await t.svc.portal.discourses.publish(ed, d.id, { version: approved.version }).catch((e) => e);
    expect(off.code).toBe("VALIDATION_FAILED");
    expect(Object.keys(off.fields)).toEqual(["flag_off"]);

    await flagSet(t.repo, true);
    const pub = await t.svc.portal.discourses.publish(ed, d.id, { version: approved.version });
    expect(pub).toMatchObject({ status: "published", publishBlockers: [] });
    expect(pub.publishedAt).toBeTruthy();
    expect(t.tags.at(-1)).toEqual(["discourses"]);
    const live = (await t.svc.discourses.bySlug("workspace-test-talk"))!;
    expect(live.blocks[1].hi).toBe("हिन्दी 2 नमूना शब्द");
    expect(live.quotes).toHaveLength(2);

    // edit after publish: workspace goes back to in_review, public text is unchanged
    const edited = await t.svc.portal.discourses.patch(tr, d.id, { version: pub.version, blocks: [{ id: "s2", hi: "संशोधित पाठ" }] });
    expect(edited.status).toBe("in_review");
    expect(edited.publishBlockers).toEqual(["not_approved"]);
    expect((await t.svc.discourses.bySlug("workspace-test-talk"))!.blocks[1].hi).toBe("हिन्दी 2 नमूना शब्द");
    expect((await t.svc.portal.discourses.list(ed, q())).meta.published).toBe(4);
    expect(Object.keys((await t.svc.portal.discourses.publish(ed, d.id, { version: edited.version }).catch((e) => e)).fields)).toEqual(["not_approved"]);

    // re-approve + re-publish updates the public text
    const re = await t.svc.portal.discourses.patch(tr, d.id, { version: edited.version, blocks: [{ id: "s2", status: "approved" }] });
    const reApproved = await t.svc.portal.discourses.approve(tr, d.id, { version: re.version });
    await t.svc.portal.discourses.publish(ed, d.id, { version: reApproved.version });
    expect((await t.svc.discourses.bySlug("workspace-test-talk"))!.blocks[1].hi).toBe("संशोधित पाठ");

    // unpublish → public 404, workspace keeps the work
    const cur = await t.svc.portal.discourses.get(ed, d.id);
    const un = await t.svc.portal.discourses.unpublish(ed, d.id, { version: cur.version });
    expect(un).toMatchObject({ status: "approved", publishedAt: null });
    expect(await t.svc.discourses.bySlug("workspace-test-talk")).toBeNull();
    expect(await errCode(t.svc.portal.discourses.unpublish(ed, d.id, { version: un.version }))).toBe("VALIDATION_FAILED");
    expect(t.tags.filter((x) => x[0] === "discourses").length).toBeGreaterThanOrEqual(3);

    // audit trail (no paragraph text in the data)
    const rows = (await t.repo.portal.listAudit({ limit: 200, offset: 0 })).rows.filter((r) => r.action.startsWith("discourse."));
    expect(rows.map((r) => r.action)).toEqual(expect.arrayContaining(["discourse.create", "discourse.update", "discourse.approve", "discourse.publish", "discourse.unpublish"]));
    expect(JSON.stringify(rows)).not.toContain("संशोधित");
  });

  it("a stale version on an action is a 409", async () => {
    const t = setup();
    const ed = await t.actor(USER.contentD);
    const d = await t.svc.portal.discourses.create(ed, body);
    expect(await errCode(t.svc.portal.discourses.approve(ed, d.id, { version: 99 }))).toBe("CONFLICT");
    expect(await errCode(t.svc.portal.discourses.get(ed, "nope"))).toBe("NOT_FOUND");
  });
});

describe("revert", () => {
  it("block from AI draft or published, discard all since publish, guards, audit", async () => {
    const t = setup();
    const ed = await t.actor(USER.contentD);
    const w = t.svc.portal.discourses;
    const d = await w.create(ed, body);
    expect(d).toMatchObject({ dirtySincePublish: false });
    expect(await errCode(w.revert(ed, d.id, { scope: "all", version: d.version }))).toBe("VALIDATION_FAILED");
    expect(await errCode(w.revert(await t.actor(USER.coordA), d.id, { scope: "all", version: d.version }))).toBe("FORBIDDEN");

    // AI draft on s2, then overwritten by a person
    t.repo.discourses.items.find((f) => f.rec.id === d.id)!.blocks[1].hiAi = "एआई मसौदा";
    const ai = await w.revert(ed, d.id, { scope: "block", blockId: "s2", source: "ai", version: d.version });
    expect(ai.blocks[1]).toMatchObject({ hi: "एआई मसौदा", status: "ai_draft", aiDraft: "एआई मसौदा", published: null });
    expect(await errCode(w.revert(ed, d.id, { scope: "block", blockId: "s2", source: "ai", version: ai.version }))).toBe("VALIDATION_FAILED");
    expect(await errCode(w.revert(ed, d.id, { scope: "block", blockId: "s2", source: "published", version: ai.version }))).toBe("VALIDATION_FAILED");
    expect(await errCode(w.revert(ed, d.id, { scope: "block", blockId: "s3", source: "ai", version: ai.version }))).toBe("VALIDATION_FAILED");

    const approved = await translateAll(t, ai);
    await flagSet(t.repo, true);
    const pub = await w.publish(ed, d.id, { version: approved.version });
    expect(pub).toMatchObject({ dirtySincePublish: false });
    const live = pub.blocks.map((b) => b.hi);

    // mistaken edits: paragraph text, title, quotes
    const e = await w.patch(ed, d.id, {
      version: pub.version,
      blocks: [{ id: "s2", hi: "गलती से बदला" }],
      title: { en: pub.title.en, hi: "गलत शीर्षक" },
      quotes: [pub.quotes[0]],
    });
    expect(e).toMatchObject({ status: "in_review", dirtySincePublish: true, dirtySummary: { blocks: 1, quotes: true, title: true, why: false, themes: false } });
    expect(e.blocks[1]).toMatchObject({ differsFromPublished: true, published: { hi: live[1] } });
    expect(await errCode(w.revert(ed, d.id, { scope: "all", version: pub.version }))).toBe("CONFLICT");

    // one paragraph back; other edits remain so still in review
    const one = await w.revert(ed, d.id, { scope: "block", blockId: "s2", source: "published", version: e.version });
    expect(one.blocks[1]).toMatchObject({ hi: live[1], status: "approved", differsFromPublished: false });
    expect(one).toMatchObject({ status: "in_review", dirtySincePublish: true, dirtySummary: { blocks: 0, quotes: true, title: true } });

    const all = await w.revert(ed, d.id, { scope: "all", version: one.version });
    expect(all).toMatchObject({ status: "published", dirtySincePublish: false, title: pub.title, quotes: pub.quotes });
    expect(all.blocks.map((b) => b.hi)).toEqual(live);
    expect(all.version).toBe(one.version + 1);
    // public page untouched throughout
    expect((await t.svc.discourses.bySlug(d.slug))!.blocks.map((b) => b.hi)).toEqual(live);

    const rows = (await t.repo.portal.listAudit({ limit: 200, offset: 0 })).rows.filter((r) => r.action === "discourse.revert");
    expect(rows).toHaveLength(3);
    expect(JSON.stringify(rows)).not.toContain("गलती");
  });
});
