import type { NextRequest } from "next/server";
import { ApiError } from "@/server/http/errors";
import { services } from "@/server/services";

// Cloudflare needs a plain response and the raw body for the signature (`Webhook-Signature`).
// No CSRF: authenticity comes from the HMAC; stale or replayed deliveries fail the time check.

/** Marks a video ready/error. Idempotent: a ready video never moves back. */
export async function POST(req: NextRequest): Promise<Response> {
  const raw = await req.text();
  try {
    await services().portal.videos.handleWebhook(raw, req.headers.get("webhook-signature"));
  } catch (err) {
    if (err instanceof ApiError && err.code === "FORBIDDEN") return new Response("Forbidden", { status: 403 });
    console.error("[video-webhook] failed", err instanceof Error ? err.message : err);
    return new Response("Error", { status: 500 });
  }
  return new Response("OK", { status: 200 });
}
