// Dev-only review tracker persistence: docs/feedback/<round>.json (+ generated .md) and shots/.
import fs from "node:fs/promises";
import path from "node:path";
import { emptyDoc, ITEM_ID_RE, MAX_SHOT_BYTES, type ReviewDoc, ReviewDoc as ReviewDocSchema, type ReviewStatus, ROUND_RE, SHOT_RE, SHOT_TYPES, type TitleMapSchema } from "./review-schema";
import type { z } from "zod";

export type TitleMap = z.infer<typeof TitleMapSchema>;

export const feedbackDir = () => path.resolve(process.cwd(), "docs", "feedback");
export const shotsDir = () => path.join(feedbackDir(), "shots");

export async function readDoc(round: string): Promise<ReviewDoc> {
  if (!ROUND_RE.test(round)) throw new Error("bad round");
  try {
    const raw = await fs.readFile(path.join(feedbackDir(), `${round}.json`), "utf8");
    const parsed = ReviewDocSchema.safeParse(JSON.parse(raw));
    return parsed.success ? { ...parsed.data, round } : emptyDoc(round);
  } catch {
    return emptyDoc(round);
  }
}

export async function listRounds(): Promise<string[]> {
  try {
    const files = await fs.readdir(feedbackDir());
    const rounds = files.map((f) => /^(round-\d+)\.json$/.exec(f)?.[1]).filter((x): x is string => !!x && ROUND_RE.test(x));
    return [...new Set(["round-1", ...rounds])].sort((a, b) => Number(a.slice(6)) - Number(b.slice(6)));
  } catch {
    return ["round-1"];
  }
}

export async function atomicWrite(file: string, data: string | Buffer): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmp, data);
  await fs.rename(tmp, file);
}

async function readTitles(round: string): Promise<TitleMap> {
  try {
    return JSON.parse(await fs.readFile(path.join(feedbackDir(), `.titles-${round}.json`), "utf8")) as TitleMap;
  } catch {
    return {};
  }
}

export async function writeDoc(doc: ReviewDoc, titles?: TitleMap): Promise<ReviewDoc> {
  if (!ROUND_RE.test(doc.round)) throw new Error("bad round");
  const out: ReviewDoc = { ...doc, updatedAt: new Date().toISOString() };
  const t = titles ?? (await readTitles(out.round));
  await atomicWrite(path.join(feedbackDir(), `${out.round}.json`), `${JSON.stringify(out, null, 2)}\n`);
  await atomicWrite(path.join(feedbackDir(), `${out.round}.md`), renderMarkdown(out, t));
  if (titles) await atomicWrite(path.join(feedbackDir(), `.titles-${out.round}.json`), JSON.stringify(titles));
  return out;
}

const ORDER: ReviewStatus[] = ["broken", "mismatch", "minor", "works", "not_tested"];
const LABEL: Record<ReviewStatus, string> = {
  broken: "Broken",
  mismatch: "Doesn't match design",
  minor: "Minor issues",
  works: "Works",
  not_tested: "Not tested",
};

export function renderMarkdown(doc: ReviewDoc, titles: TitleMap): string {
  const ids = Object.keys(doc.items);
  const lines: string[] = [`# Review ${doc.round}`, "", `Updated ${doc.updatedAt || "-"}`, ""];
  const total = Object.keys(titles).length || ids.length;
  const tested = ids.filter((i) => doc.items[i]!.status !== "not_tested").length;
  const counts = ORDER.map((s) => `${LABEL[s]} ${ids.filter((i) => doc.items[i]!.status === s).length}`).join(" · ");
  lines.push(`Tested ${tested}/${total}. ${counts}`, "");
  for (const s of ORDER.slice(0, 4)) {
    const hit = ids.filter((i) => doc.items[i]!.status === s);
    if (!hit.length) continue;
    lines.push(`## ${LABEL[s]} (${hit.length})`, "");
    for (const id of hit) {
      const it = doc.items[id]!;
      const t = titles[id];
      const dev = (["desktop", "mobile", "hindi"] as const).filter((d) => it.devices[d]).join(", ");
      lines.push(`### ${t ? `${t.title} \`${t.path}\`` : id} (\`${id}\`)`);
      if (t) lines.push(`Group: ${t.group}`);
      lines.push(`Checked: ${dev || "none"}`);
      if (it.notes.trim()) lines.push("", it.notes.trim());
      for (const sh of it.shots) lines.push("", `![${sh}](shots/${sh})`);
      lines.push("");
    }
  }
  const loose = ids.filter((i) => doc.items[i]!.status === "not_tested" && (doc.items[i]!.notes.trim() || doc.items[i]!.shots.length));
  if (loose.length) {
    lines.push("## Notes on items still marked Not tested", "");
    for (const id of loose) {
      const it = doc.items[id]!;
      lines.push(`- \`${id}\`${titles[id] ? ` ${titles[id]!.title}` : ""}: ${it.notes.trim().replace(/\n/g, " ")}`);
      for (const sh of it.shots) lines.push(`  - ![${sh}](shots/${sh})`);
    }
    lines.push("");
  }
  if (doc.general.length) {
    lines.push(`## General notes (${doc.general.length})`, "");
    for (const g of doc.general) {
      lines.push(`### ${g.title.trim() || g.id}`, "");
      if (g.notes.trim()) lines.push(g.notes.trim(), "");
      for (const sh of g.shots) lines.push(`![${sh}](shots/${sh})`, "");
    }
  }
  return `${lines.join("\n").trimEnd()}\n`;
}

export class ShotError extends Error {}

export function magicOk(ext: "png" | "jpg" | "webp", b: Buffer): boolean {
  if (ext === "png") return b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (ext === "jpg") return b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  return b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP";
}

/** Saves an image as `<id>-<n>.<ext>` with the next free n. Validates id, type, size and magic bytes. */
export async function saveShot(id: string, mime: string, bytes: Buffer): Promise<string> {
  if (!ITEM_ID_RE.test(id)) throw new ShotError("bad id");
  const ext = SHOT_TYPES[mime];
  if (!ext) throw new ShotError("png, jpg or webp only");
  if (!bytes.length || bytes.length > MAX_SHOT_BYTES) throw new ShotError("max 5 MB");
  if (!magicOk(ext, bytes)) throw new ShotError("not a valid image");
  await fs.mkdir(shotsDir(), { recursive: true });
  let n = 1;
  for (const f of await fs.readdir(shotsDir())) {
    const m = /^(.*)-(\d+)\.[a-z]+$/.exec(f);
    if (m && m[1] === id) n = Math.max(n, Number(m[2]) + 1);
  }
  const name = `${id}-${n}.${ext}`;
  if (!SHOT_RE.test(name)) throw new ShotError("bad name");
  await atomicWrite(path.join(shotsDir(), name), bytes);
  return name;
}
