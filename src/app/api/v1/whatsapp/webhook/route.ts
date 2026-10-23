import { after, type NextRequest } from "next/server";
import { env } from "@/server/env";
import { safeEqual } from "@/server/security/crypto";
import { services } from "@/server/services";
import { verifyWebhookSignature } from "@/server/providers/whatsapp";

// Meta needs plain responses (not the JSON envelope) and the raw body for the signature.

/** Subscription handshake: echo `hub.challenge` when the verify token matches. */
export async function GET(req: NextRequest): Promise<Response> {
  const q = req.nextUrl.searchParams;
  const token = env().WA_VERIFY_TOKEN;
  const given = q.get("hub.verify_token") ?? "";
  if (q.get("hub.mode") === "subscribe" && token && safeEqual(given, token)) {
    return new Response(q.get("hub.challenge") ?? "", { status: 200, headers: { "content-type": "text/plain" } });
  }
  return new Response("Forbidden", { status: 403 });
}

/** Signed messages (`X-Hub-Signature-256`). Anything unsigned is refused; processing continues after the 200. */
export async function POST(req: NextRequest): Promise<Response> {
  const raw = await req.text();
  const secret = env().WA_APP_SECRET;
  if (!secret || !verifyWebhookSignature(raw, req.headers.get("x-hub-signature-256"), secret)) {
    return new Response("Forbidden", { status: 403 });
  }
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return new Response("Bad Request", { status: 400 });
  }
  after(async () => {
    try {
      await services().wa.handleWebhook(body);
    } catch (err) {
      console.error("[webhook] processing failed", err instanceof Error ? err.message : err);
    }
  });
  return new Response("OK", { status: 200 });
}
