// M7.1: discourse audio/video — import mapping, public approved filter, workspace approve/hide. Placeholder data only.
import { describe, expect, it } from "vitest";
import { AdminDiscourseDetail, DiscourseDetail, DiscourseMediaPatch } from "@/contract";
import { MediaIndex, mediaForEntry } from "@/server/domain/discourse-media-import";
import { USER } from "@/server/mock/fixtures";
import { MockRepo } from "@/server/repo/mock";
import { createServices } from "@/server/services/create";
import { errCode } from "./support/m6";
import { NOW } from "./support/services";

const ID = `01DISCOURSE${String(1).padStart(15, "0")}`;

function setup() {
  const repo = new MockRepo();
  const svc = createServices(repo, { now: () => NOW, mediaBase: "/media" });
  const actor = async (id: string) => (await svc.auth.actorFor(id, { requestId: "t", ipHash: null }))!;
  return { repo, svc, actor };
}

describe("media import mapping", () => {
  const raw = [
    {
      n: 4,
      status: "audio_official",
      audio: [
        { date: "1973-05-24", heading: "Sample heading", page: "https://example.org/page", audio: "https://example.org/a.mp3" },
        { date: "1973-05-24", heading: "Dup", page: null, audio: "https://example.org/a.mp3" },
        { heading: "Bad", audio: "ftp://example.org/b.mp3" },
      ],
      videos: [
        { id: "mediumVid01", title: "M", duration_s: 100.4, channel: "Ch", url: "https://www.youtube.com/watch?v=mediumVid01", score: 50, confidence: "medium", official: false },
        { id: "highVid0001", title: "H", duration_s: 3739, channel: "Ch2", score: 90, confidence: "high", official: false },
        { id: "!", title: "bad id", confidence: "high" },
      ],
    },
  ];

  it("audio first and approved, video by score, only high confidence approved, bad rows skipped", () => {
    const [entry] = MediaIndex.parse(raw);
    const m = mediaForEntry(entry);
    expect(m.map((x) => x.kind)).toEqual(["audio", "video", "video"]);
    expect(m[0]).toMatchObject({ provider: "radiosai", official: true, approved: true, confidence: null, recordedDate: "1973-05-24", sourcePage: "https://example.org/page" });
    expect(m[1]).toMatchObject({ externalId: "highVid0001", url: "https://www.youtube.com/watch?v=highVid0001", approved: true, durationS: 3739, official: false });
    expect(m[2]).toMatchObject({ externalId: "mediumVid01", approved: false, confidence: "medium", durationS: 100 });
    expect(m.map((x) => x.sort)).toEqual([0, 1, 2]);
  });
});

describe("public + workspace media (mock repo)", () => {
  it("public detail serves approved media only, in order; shape parses", async () => {
    const t = setup();
    await t.repo.m6.setSetting("flags", { discourses: true, offline_mode: false, ai_extraction: false }, null);
    const d = (await t.svc.discourses.bySlug("sample-students"))!;
    expect(() => DiscourseDetail.parse(JSON.parse(JSON.stringify(d)))).not.toThrow();
    expect(d.media.map((m) => m.kind)).toEqual(["audio", "video"]);
    expect(d.media.some((m) => m.title === "Pending video candidate")).toBe(false);
    expect(JSON.stringify(d.media)).not.toContain("score");
    expect((await t.svc.discourses.bySlug("sample-peace"))!.media).toEqual([]);
  });

  it("approve/hide needs discourses.review, shows up publicly without republish, audited", async () => {
    const t = setup();
    await t.repo.m6.setSetting("flags", { discourses: true, offline_mode: false, ai_extraction: false }, null);
    const w = t.svc.portal.discourses;
    const tr = await t.actor(USER.translatorE);
    const before = AdminDiscourseDetail.parse(JSON.parse(JSON.stringify(await w.get(tr, ID))));
    expect(before.media).toHaveLength(3);
    const pending = before.media.find((m) => !m.approved)!;
    expect(pending.confidence).toBe("medium");

    expect(await errCode(w.setMedia(await t.actor(USER.coordA), ID, pending.id, { approved: true }))).toBe("FORBIDDEN");
    expect(await errCode(w.setMedia(tr, ID, "01NOPE", { approved: true }))).toBe("NOT_FOUND");
    expect(DiscourseMediaPatch.safeParse({}).success).toBe(false);

    const after = await w.setMedia(tr, ID, pending.id, { approved: true });
    expect(after.media.find((m) => m.id === pending.id)!.approved).toBe(true);
    expect(after.version).toBe(before.version);
    expect((await t.svc.discourses.bySlug("sample-students"))!.media).toHaveLength(3);

    await w.setMedia(tr, ID, pending.id, { approved: false });
    expect((await t.svc.discourses.bySlug("sample-students"))!.media).toHaveLength(2);
    const audit = await t.repo.portal.listAudit({ action: "discourse.media", limit: 10, offset: 0 });
    expect(audit.rows.length).toBe(2);
  });
});
