import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { resolveUnder } from "@/server/dev/design-path";
import { ReviewPut, ROUND_RE, SHOT_RE } from "@/server/dev/review-schema";
import { magicOk, renderMarkdown, saveShot, ShotError } from "@/server/dev/review-store";

describe("resolveUnder", () => {
  const root = path.resolve("/srv/design");
  it("accepts nested files", () => expect(resolveUnder(root, ["public", "a.html"])).toBe(`${root}/public/a.html`));
  it.each([[[".."]], [["a", ".."]], [["%2e%2e", "x"]], [["a%2F..%2Fb"]], [["a\\b"]], [[".env"]], [["a%00"]], [[""]], [[]], [["%zz"]]])("rejects %j", (segs) => {
    expect(resolveUnder(root, segs as string[])).toBeNull();
  });
});

describe("review schema", () => {
  it("round + shot patterns", () => {
    expect(ROUND_RE.test("round-1")).toBe(true);
    expect(ROUND_RE.test("../round-1")).toBe(false);
    expect(ROUND_RE.test("round-0")).toBe(false);
    expect(SHOT_RE.test("home-1.png")).toBe(true);
    expect(SHOT_RE.test("../home-1.png")).toBe(false);
    expect(SHOT_RE.test("home-1.svg")).toBe(false);
  });
  it("fills defaults", () => {
    const r = ReviewPut.parse({ doc: { round: "round-1", items: { home: {} } } });
    expect(r.doc.items.home).toMatchObject({ status: "not_tested", notes: "", shots: [] });
  });
  it("rejects bad status, id, shot name", () => {
    expect(ReviewPut.safeParse({ doc: { round: "round-1", items: { home: { status: "nope" } } } }).success).toBe(false);
    expect(ReviewPut.safeParse({ doc: { round: "round-1", items: { "../x": {} } } }).success).toBe(false);
    expect(ReviewPut.safeParse({ doc: { round: "round-1", items: { home: { shots: ["../../etc/passwd"] } } } }).success).toBe(false);
    expect(ReviewPut.safeParse({ doc: { round: "x" } }).success).toBe(false);
  });
});

describe("markdown", () => {
  it("lists broken first", () => {
    const doc = ReviewPut.parse({ doc: { round: "round-1", items: { a: { status: "works" }, b: { status: "broken", notes: "boom" } } } }).doc;
    const md = renderMarkdown(doc, {});
    expect(md.indexOf("## Broken")).toBeGreaterThan(-1);
    expect(md.indexOf("## Broken")).toBeLessThan(md.indexOf("## Works"));
    expect(md).toContain("boom");
  });
});

describe("saveShot", () => {
  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(20)]);
  let dir: string;
  let prev: string;
  beforeAll(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), "rv-"));
    prev = process.cwd();
    process.chdir(dir);
  });
  afterAll(async () => {
    process.chdir(prev);
    await fs.rm(dir, { recursive: true, force: true });
  });
  it("magic bytes", () => {
    expect(magicOk("png", png)).toBe(true);
    expect(magicOk("jpg", png)).toBe(false);
  });
  it("saves incrementing names", async () => {
    expect(await saveShot("home", "image/png", png)).toBe("home-1.png");
    expect(await saveShot("home", "image/png", png)).toBe("home-2.png");
  });
  it("rejects bad id, type, content, size", async () => {
    await expect(saveShot("../x", "image/png", png)).rejects.toBeInstanceOf(ShotError);
    await expect(saveShot("home", "image/svg+xml", png)).rejects.toBeInstanceOf(ShotError);
    await expect(saveShot("home", "image/png", Buffer.from("hello"))).rejects.toBeInstanceOf(ShotError);
    await expect(saveShot("home", "image/png", Buffer.alloc(5 * 1024 * 1024 + 1))).rejects.toBeInstanceOf(ShotError);
  });
});
