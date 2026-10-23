# M7 QA Q1 log
- Done: playwright.config.ts (projects chromium-desktop 1280 / mobile 375; perf via E2E_PERF=1), scripts e2e/e2e:a11y/e2e:perf/e2e:collect, helpers, routes, budgets, global-setup (seed + tokens + state-admin storage), a11y.spec, perf.spec.
- Deviation: login OTP read from SERVER STDOUT log (webServer tees to tests/e2e/.cache/server.log; external server: E2E_SERVER_LOG). Dev messages endpoint masks login codes ("••••••", LoggedWhatsApp) so plan's endpoint approach does not work.
- Deviation: known issues tolerated per (route, check:rule) in tests/e2e/known.ts (finer than test.fixme); F3 empties it.
- Done: collect run (232 audits, coverage.jsonl added to a11y.spec in COLLECT mode) -> docs/progress/M7-a11y-findings.md; known.ts filled (ids A1-A13, P1 for perf CLS); perf run done (build + e2e:perf collect). `pnpm e2e:a11y` green 234/234 (16.6m).
- Next: Q2 journeys (needs proxy fix for /admin/events/new 404 = A13).
