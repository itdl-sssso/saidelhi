# districts-real
Done: 10 real districts + 56 samithis (src/server/data/sssso-units.json) in mock fixtures + seed; legacy-content aliases; DistrictMap tiles; dev fixtures hang off coord-less real samithis; docs; tests updated (369 pass); redirect rows for old slugs (new-delhi, south, noida-ghaziabad).
Notes: ncr-pincodes.json is centroids only (no district map) -> no change. Old placeholder org units removed by seed (full org_unit reset).
Open: retired /districts/<old> slugs do not 301 in `next start` (proxy probe rewrite returns 200 for any unknown slug in this env, pre-existing; redirects only fire via legacy path rules). Shared DB :3307 gets reseeded by other checkouts (main re-adds placeholders) -> run pnpm db:seed.
