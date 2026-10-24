# prod-404
Done: root cause + fix + tests.
- Cause: prod serves the catch-all/not-found as a PPR shell (x-nextjs-postponed:1). Router honours NextResponse.rewrite status only in dev; shell goes out 200.
- Fix: src/proxy.ts notFoundResponse(): loopback fetch of /<locale>/__not-found, returned as proxy-made body with status 404 (router honours status for proxy bodies). Fallback: old rewrite. x-nf-inner header skips probes. Also used for legacy "moved" + discourses-off.
- Tests: public.spec 8 unknown-detail cases (EN/HI x events/districts/centres/news); prod cold start x2 green, e2e:journeys prod 44 pass.
- Not covered: arbitrary unknown paths (/nothing/here) still 200 in prod (catch-all notFound() inside shell).
