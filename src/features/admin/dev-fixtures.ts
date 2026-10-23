// TEMP M6 until backend merge — dev-only fetch shim. When an /api/v1/admin M6 route answers 404 (service not
// merged into this worktree yet) and NODE_ENV !== "production", a registered fixture handler answers instead.
// Integration removes: this file, dev-fixtures-load.ts, every `<x>/dev-fixtures.ts`, and the
// `import "./dev-fixtures-load"` lines in useApi.ts / useAction.ts. List kept in docs/progress/M6-frontend.md.
export interface FixtureReq {
  method: string;
  path: string;
  query: URLSearchParams;
  body: unknown;
}
export interface FixtureRes {
  status?: number;
  data?: unknown;
  meta?: unknown;
  /** Raw body for CSV / text downloads. */
  raw?: { text: string; type: string };
}
export type FixtureHandler = (req: FixtureReq) => FixtureRes | undefined;

const handlers: FixtureHandler[] = [];
export const registerFixtures = (...h: FixtureHandler[]) => void handlers.push(...h);

let installed = false;
export function installDevFixtures(loaders: Array<() => Promise<unknown>>) {
  if (installed || typeof window === "undefined" || process.env.NODE_ENV === "production") return;
  installed = true;
  const real = window.fetch.bind(window);
  const ready = Promise.all(loaders.map((l) => l()));
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const res = await real(input, init);
    if (res.status !== 404) return res;
    const url = new URL(typeof input === "string" || input instanceof URL ? input.toString() : input.url, window.location.origin);
    if (!url.pathname.startsWith("/api/v1/admin/")) return res;
    await ready;
    let body: unknown = undefined;
    try {
      body = typeof init?.body === "string" ? JSON.parse(init.body) : init?.body;
    } catch {
      body = undefined;
    }
    const req: FixtureReq = { method: (init?.method ?? "GET").toUpperCase(), path: url.pathname.replace("/api/v1", ""), query: url.searchParams, body };
    for (const h of handlers) {
      const out = h(req);
      if (!out) continue;
      if (out.raw) return new Response(out.raw.text, { status: out.status ?? 200, headers: { "content-type": out.raw.type } });
      const status = out.status ?? 200;
      const payload = status >= 400 ? { error: out.data } : { data: out.data, ...(out.meta ? { meta: out.meta } : {}) };
      return new Response(JSON.stringify(payload), { status, headers: { "content-type": "application/json" } });
    }
    return res;
  };
}
