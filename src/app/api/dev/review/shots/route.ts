import fs from "node:fs/promises";
import path from "node:path";
import { type NextRequest, NextResponse } from "next/server";
import { devEnabled, devNotFound, json, sameOrigin } from "@/server/dev/gate";
import { MAX_SHOT_BYTES, SHOT_RE } from "@/server/dev/review-schema";
import { saveShot, ShotError, shotsDir } from "@/server/dev/review-store";

const MIME = { png: "image/png", jpg: "image/jpeg", webp: "image/webp" } as const;

/** Dev only: GET ?file=<id>-<n>.png serves a saved screenshot (name pattern checked, no paths). */
export async function GET(req: NextRequest) {
  if (!devEnabled()) return devNotFound();
  const file = req.nextUrl.searchParams.get("file") ?? "";
  if (!SHOT_RE.test(file)) return devNotFound();
  try {
    const buf = await fs.readFile(path.join(shotsDir(), file));
    const ext = file.split(".").pop() as keyof typeof MIME;
    return new NextResponse(new Uint8Array(buf), { headers: { "content-type": MIME[ext], "cache-control": "no-store", "x-content-type-options": "nosniff" } });
  } catch {
    return devNotFound();
  }
}

/** Dev only: POST multipart { id, file } -> { name }. png/jpg/webp, max 5 MB. */
export async function POST(req: NextRequest) {
  if (!devEnabled()) return devNotFound();
  if (!sameOrigin(req)) return json({ error: "cross-origin" }, 403);
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > MAX_SHOT_BYTES + 100_000) return json({ error: "max 5 MB" }, 413);
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return json({ error: "bad form" }, 400);
  }
  const id = form.get("id");
  const file = form.get("file");
  if (typeof id !== "string" || !(file instanceof File)) return json({ error: "id and file required" }, 400);
  try {
    const name = await saveShot(id, file.type, Buffer.from(await file.arrayBuffer()));
    return json({ name });
  } catch (e) {
    if (e instanceof ShotError) return json({ error: e.message }, 400);
    throw e;
  }
}
