# prefetch-hang
Root cause: LanguageSwitch (portal top bar) `<Link locale="en">` -> `/en/admin/x` (explicit prefix) prefetched in prod; RSC prefetch 307 -> 307 -> postponed 200 body never completes (~29.5s abort). Visible only on queried URLs (href gets ?qs after hydration via useSearchParams).
Fix: `prefetch={false}` on LanguageSwitch links (commit de545a3). Test: tests/e2e/journeys/prefetch.spec.ts (4 URLs).
Verified prod :5200: without fix 3/3 queried URLs fail (8.4s), with fix 4/4 pass (~2.4s).
Next: DoD (typecheck, lint, seed, test, build, e2e:journeys prod).
