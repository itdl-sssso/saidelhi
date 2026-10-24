# /dev/review tracker

Done: catalog (84 items, samples from services at runtime), ReviewTracker UI, GET/PUT /api/dev/review (zod, atomic, md summary), shots upload/serve, /api/dev/design/<path> (traversal-safe), unit tests tests/dev-review.test.ts, lint fixes.
Data: docs/feedback/<round>.json + .md + shots/ (+ hidden .titles-<round>.json). Gate: NODE_ENV=production -> 404.
Notes: no `dynamic` route config (Cache Components forbids). Dev port 5300 checked at 375 (no overflow).

Final: DoD green (typecheck, lint, test [portal.db flake passes alone], build). Prod 404 verified; dev save verified, test files removed.
