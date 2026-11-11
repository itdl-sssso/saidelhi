import type { NextRequest } from "next/server";
import { env } from "@/server/env";
import { devEnabled, devNotFound } from "@/server/dev/gate";
import { mockUploads } from "@/server/providers/video/mock";

// Dev only (VIDEO_PROVIDER=mock): a minimal tus server so the upload UI can be tried without Cloudflare.
// It counts the bytes, discards them, and marks the video ready after the last chunk.

const H = { "Tus-Resumable": "1.0.0", "Cache-Control": "no-store" };
const on = () => devEnabled() && env().VIDEO_PROVIDER === "mock";
type Ctx = { params: Promise<{ uid: string }> };

export async function OPTIONS(): Promise<Response> {
  if (!on()) return devNotFound();
  return new Response(null, { status: 204, headers: { ...H, "Tus-Version": "1.0.0", "Tus-Extension": "creation" } });
}

export async function HEAD(_req: NextRequest, { params }: Ctx): Promise<Response> {
  const e = on() ? mockUploads.get((await params).uid) : null;
  if (!e) return new Response(null, { status: 404, headers: H });
  return new Response(null, { status: 200, headers: { ...H, "Upload-Offset": String(e.offset), "Upload-Length": String(e.length) } });
}

export async function PATCH(req: NextRequest, { params }: Ctx): Promise<Response> {
  const uid = (await params).uid;
  const e = on() ? mockUploads.get(uid) : null;
  if (!e) return new Response(null, { status: 404, headers: H });
  if (Number(req.headers.get("upload-offset")) !== e.offset) return new Response(null, { status: 409, headers: H });
  let n = 0;
  const reader = req.body?.getReader();
  if (reader) for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    n += value.byteLength;
  }
  const after = mockUploads.receive(uid, n);
  return new Response(null, { status: 204, headers: { ...H, "Upload-Offset": String(after?.offset ?? e.offset) } });
}
