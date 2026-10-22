/* Service worker for /f/ and /hi/f/ form links. It only controls those pages (registered with that scope).
   Network first, cache as fallback: online users always get fresh pages; with no signal the form shell,
   its scripts and fonts still open. API calls are never touched, so drafts and sends go through the app. */
const CACHE = "f-shell-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const isPage = (req) => req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html");

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok && res.type === "basic") {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => undefined);
        }
        return res;
      })
      .catch(async () => {
        const hit = await caches.match(req, { ignoreVary: true });
        if (hit) return hit;
        if (isPage(req)) {
          // A form page we never opened: fall back to the verify page of the same link, which resumes offline.
          const base = url.pathname.replace(/\/(form|done)\/?$/, "");
          const shell = await caches.match(new Request(url.origin + base), { ignoreVary: true });
          if (shell) return shell;
        }
        return Response.error();
      }),
  );
});
