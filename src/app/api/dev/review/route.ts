import type { NextRequest } from "next/server";
import { devEnabled, devNotFound, json, sameOrigin } from "@/server/dev/gate";
import { ReviewPut, RoundId } from "@/server/dev/review-schema";
import { listRounds, readDoc, writeDoc } from "@/server/dev/review-store";

/** Dev only: GET ?round=round-1 -> { doc, rounds }. */
export async function GET(req: NextRequest) {
  if (!devEnabled()) return devNotFound();
  const round = RoundId.safeParse(req.nextUrl.searchParams.get("round") ?? "round-1");
  if (!round.success) return json({ error: "bad round" }, 400);
  return json({ doc: await readDoc(round.data), rounds: await listRounds() });
}

/** Dev only: PUT ?round=round-1 body { doc, titles? } replaces the round file (atomic) and regenerates the .md. */
export async function PUT(req: NextRequest) {
  if (!devEnabled()) return devNotFound();
  if (!sameOrigin(req)) return json({ error: "cross-origin" }, 403);
  const round = RoundId.safeParse(req.nextUrl.searchParams.get("round") ?? "");
  if (!round.success) return json({ error: "bad round" }, 400);
  const text = await req.text();
  if (text.length > 2_000_000) return json({ error: "too large" }, 413);
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return json({ error: "bad json" }, 400);
  }
  const body = ReviewPut.safeParse(raw);
  if (!body.success) return json({ error: "invalid", issues: body.error.issues.slice(0, 5).map((i) => `${i.path.join(".")}: ${i.message}`) }, 400);
  if (body.data.doc.round !== round.data) return json({ error: "round mismatch" }, 400);
  const saved = await writeDoc(body.data.doc, body.data.titles);
  return json({ updatedAt: saved.updatedAt });
}
