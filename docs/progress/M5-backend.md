# M5 backend progress

ALL DONE (DoD: typecheck, lint, test green; build not run).

## Done
- repo: recurring filter, partnersByKind, articlesForEvents, redirect rows, category O hidden; migration 0005 (redirect)
- services: values, programs, join, districts.list + demographics, centres pincode distance, redirects, articles.exists, programs.exists
- routes: values, programs, programs/[type], join, redirects, districts
- proxy: legacy 301/302 + moved rewrite (?moved=1), probes news/districts/programs/values, centres/map excluded
- legacy: scripts/legacy-polish.ts (district tags, migration redirect rows; run from import-legacy + seed), sanitizeBody media rewrite
- sitemap.ts, robots.ts; tests m5-public, m5.db.integration, legacy-content

## Decisions
- env WHATSAPP_PUBLIC_NUMBER > WA_DISPLAY_NUMBER > dev-only placeholder; keyword default JOIN (bot already routes "join")
- ncr-pincodes.json is approximate hand-compiled (TODO replace with GeoNames)
- eye funnel always returned (nulls = dash)

## Blockers / notes
- trailing-slash legacy URLs get 308 then 301 (two hops): next.config skipTrailingSlashRedirect:true would fix (not my file)
- dev server needs --webpack in worktree (symlinked node_modules)
