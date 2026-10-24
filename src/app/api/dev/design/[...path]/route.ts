import fs from "node:fs/promises";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { designContentType, designRoot, resolveUnder } from "@/server/dev/design-path";
import { devEnabled, devNotFound } from "@/server/dev/gate";

export const dynamic = "force-dynamic";

/** Dev only, read-only: serves files under docs/design so the review page can link to design prototypes. */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  if (!devEnabled()) return devNotFound();
  const { path: segs } = await ctx.params;
  const root = designRoot();
  const full = resolveUnder(root, segs);
  if (!full) return devNotFound();
  try {
    // Resolve symlinks too: the real path must still sit under the root.
    const real = await fs.realpath(full);
    if (!real.startsWith(`${root}/`)) return devNotFound();
    const st = await fs.stat(real);
    if (!st.isFile()) return devNotFound();
    const buf = await fs.readFile(real);
    return new NextResponse(new Uint8Array(buf), { headers: { "content-type": designContentType(real), "cache-control": "no-store", "x-content-type-options": "nosniff" } });
  } catch {
    return devNotFound();
  }
}
