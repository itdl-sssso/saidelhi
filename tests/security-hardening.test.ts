// Regression tests for the security-hardening branch: headers, client IP, dev routes, sanitisers.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { decode } from "@/server/services/portal/official-thought";

const require = createRequire(import.meta.url);
// Same matcher Next uses for `headers()` sources.
const { pathToRegexp } = require("next/dist/compiled/path-to-regexp") as { pathToRegexp: (p: string) => RegExp };

type Rule = { source: string; headers: { key: string; value: string }[] };
async function loadRules(env: string = "test"): Promise<{ rules: Rule[]; config: { poweredByHeader?: boolean } }> {
  vi.resetModules();
  vi.stubEnv("NODE_ENV", env);
  const mod = (await import("../next.config")).default as unknown as { headers(): Promise<Rule[]>; poweredByHeader?: boolean };
  return { rules: await mod.headers(), config: mod };
}
const has = (r: Rule, key: string) => r.headers.find((h) => h.key.toLowerCase() === key.toLowerCase());
const matches = (r: Rule, p: string) => pathToRegexp(r.source).test(p);

afterEach(() => vi.unstubAllEnvs());

describe("next.config security headers", () => {
  it("every rule has XFO, nosniff, referrer policy; poweredByHeader off", async () => {
    const { rules, config } = await loadRules();
    expect(rules.length).toBeGreaterThanOrEqual(2);
    for (const r of rules) {
      expect(has(r, "X-Frame-Options")?.value).toBe("SAMEORIGIN");
      expect(has(r, "X-Content-Type-Options")?.value).toBe("nosniff");
      expect(has(r, "Referrer-Policy")).toBeTruthy();
    }
    expect(config.poweredByHeader).toBe(false);
  });

  it("CSP is frame-ancestors based, with no script-src/default-src", async () => {
    const { rules } = await loadRules();
    const csp = rules.map((r) => has(r, "Content-Security-Policy")).filter(Boolean);
    expect(csp).toHaveLength(1);
    expect(csp[0]!.value).toContain("frame-ancestors 'self'");
    expect(csp[0]!.value).not.toMatch(/script-src|default-src/);
  });

  it("CSP rule covers pages and excludes routes that set their own CSP", async () => {
    const { rules } = await loadRules();
    const cspRule = rules.find((r) => has(r, "Content-Security-Policy"))!;
    const plain = rules.find((r) => !has(r, "Content-Security-Policy"))!;
    for (const p of ["/", "/admin/login", "/api/v1/health", "/hi/events"]) expect(matches(cspRule, p), p).toBe(true);
    for (const p of ["/media/x.svg", "/api/v1/admin/attachments/1", "/api/v1/admin/inbox/1/media", "/api/v1/admin/gallery/photos/1/file"]) {
      expect(matches(cspRule, p), `${p} must not get CSP`).toBe(false);
      expect(matches(plain, p), `${p} must get non-CSP headers`).toBe(true);
    }
  });

  it("HSTS only in production", async () => {
    const dev = await loadRules("development");
    expect(dev.rules.some((r) => has(r, "Strict-Transport-Security"))).toBe(false);
    const prod = await loadRules("production");
    expect(prod.rules.every((r) => has(r, "Strict-Transport-Security"))).toBe(true);
  });
});

describe("nginx snippet", () => {
  const conf = fs.readFileSync(path.resolve(import.meta.dirname, "../deploy/nginx/saidelhi-proxy.conf"), "utf8");
  it("replaces forwarded headers with $remote_addr, never appends", () => {
    expect(conf).toMatch(/proxy_set_header\s+X-Forwarded-For\s+\$remote_addr\s*;/);
    expect(conf).toMatch(/proxy_set_header\s+X-Real-IP\s+\$remote_addr\s*;/);
    expect(conf).not.toContain("$proxy_add_x_forwarded_for");
  });
});

describe("OTP rate limit keyed on trusted client IP", () => {
  type Post = (r: NextRequest, c: { params: Promise<Record<string, string>> }) => Promise<Response>;
  const call = (post: Post, realIp: string, xff: string, phone = "+919000000001") =>
    post(
      new NextRequest("http://x/api/v1/auth/otp", {
        method: "POST",
        body: JSON.stringify({ phone }),
        headers: { "content-type": "application/json", "x-real-ip": realIp, "x-forwarded-for": xff },
      }),
      { params: Promise.resolve({}) },
    );

  it("spoofed x-forwarded-for does not dodge the limit; other real IP is independent", async () => {
    vi.resetModules();
    vi.stubEnv("DATA_SOURCE", "mock");
    const { POST } = await import("@/app/api/v1/auth/otp/route");
    const post = POST as unknown as Post;
    let last = 0;
    for (let i = 0; i < 21; i++) {
      const res = await call(post, "10.20.30.7", `10.0.0.${i}, 10.99.0.1`, `+9199990000${String(i).padStart(2, "0")}`);
      last = res.status;
      if (i < 20) expect(res.status, `request ${i + 1}`).not.toBe(429);
    }
    expect(last).toBe(429);
    expect((await call(post, "10.20.30.8", "10.0.0.1", "+919999000099")).status).not.toBe(429);
  });
});

describe("dev routes", () => {
  const ctx = (segs: string[]) => ({ params: Promise.resolve({ path: segs }) });

  it("shots GET rejects traversal variants, 404 in production", async () => {
    const { GET } = await import("@/app/api/dev/review/shots/route");
    for (const f of ["../../etc/passwd", "..%2F..%2Fetc%2Fpasswd", "%2e%2e/%2e%2e/etc/passwd", "....//etc/passwd", "a/../../b.png", "..\\x.png", "x.png%00.svg", ""]) {
      const res = await GET(new NextRequest(`http://localhost/api/dev/review/shots?file=${encodeURIComponent(f)}`));
      expect(res.status, f).toBe(404);
      const raw = await GET(new NextRequest(`http://localhost/api/dev/review/shots?file=${f}`));
      expect(raw.status, `raw ${f}`).toBe(404);
    }
    vi.stubEnv("NODE_ENV", "production");
    expect((await GET(new NextRequest("http://localhost/api/dev/review/shots?file=home-1.png"))).status).toBe(404);
  });

  it("design route blocks traversal and symlink escape, 404 in production", async () => {
    const tmp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "sec-design-")));
    const root = path.join(tmp, "design");
    fs.mkdirSync(root);
    fs.writeFileSync(path.join(root, "ok.html"), "<p>ok</p>");
    fs.writeFileSync(path.join(tmp, "secret.txt"), "secret");
    fs.symlinkSync(path.join(tmp, "secret.txt"), path.join(root, "link.txt"));
    fs.symlinkSync(tmp, path.join(root, "dirlink"));
    try {
      vi.resetModules();
      vi.doMock("@/server/dev/design-path", async (orig) => ({ ...(await orig<typeof import("@/server/dev/design-path")>()), designRoot: () => root }));
      const { GET } = await import("@/app/api/dev/design/[...path]/route");
      const req = new NextRequest("http://localhost/api/dev/design/x");
      expect((await GET(req, ctx(["ok.html"]))).status).toBe(200);
      for (const segs of [[".."], ["..", "secret.txt"], ["%2e%2e", "secret.txt"], ["link.txt"], ["dirlink", "secret.txt"]]) {
        expect((await GET(req, ctx(segs))).status, segs.join("/")).toBe(404);
      }
      vi.stubEnv("NODE_ENV", "production");
      expect((await GET(req, ctx(["ok.html"]))).status).toBe(404);
    } finally {
      vi.doUnmock("@/server/dev/design-path");
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});

describe("official thought decode", () => {
  it.each(["<scr<script>ipt>alert(1)</scr</script>ipt>", "&lt;img onerror=x&gt;", "&amp;lt;b&amp;gt;", "&#60;script&#62;x&#x3c;/script&#x3e;", "<<a>b>>", "<!-- <x> -->"])("%s -> no angle brackets", (s) => {
    expect(decode(s)).not.toMatch(/[<>]/);
  });
});
