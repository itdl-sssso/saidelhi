import { NextResponse, type NextRequest } from "next/server";

/** Dev tools answer 404 in production. */
export const devEnabled = () => process.env.NODE_ENV !== "production";

export const devNotFound = () => new NextResponse("Not found", { status: 404 });

/** Writes must come from the same origin (browser sends Origin on fetch POST/PUT); blocks cross-site form posts. */
export function sameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === req.headers.get("host");
  } catch {
    return false;
  }
}

export const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "cache-control": "no-store" } });
