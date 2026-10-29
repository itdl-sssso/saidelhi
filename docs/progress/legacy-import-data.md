# legacy-import-data (data/backend track)
Branch: worktree-agent-a612724d92a7d70da
## Done
- env copied, raw KML saved to .local-dumps/legacy-samithi-map.kml (gitignored).
## Next
1 samithi map merge -> units json + fixtures; 2 coordinators; 3 covers; 4 gallery; 5 DoD.
## Decisions
## Blockers
- T1 done: scripts/merge-samithi-map.ts (pnpm data:merge-samithi-map) -> units json (lat/lng, localName, district `centres`), fixtures org.ts builds centres from them. Tests adjusted (2). wa.db.integration eye-camp test fails on clean main too (date-dependent, pre-existing).
- T2 done: scripts/import-coordinators.ts (pnpm db:import-coordinators). First run: 76 people w/ phone (+12 KML names w/o phone), state_admin 3, district_coord 12 (Gurugram + West have 2 each: DB president vs KML president differ), samithi_coord 48 (east-5 has 2), no role 13; users created 63 (status invited, no WhatsApp sent). centre contactPhone set 51. Rerun idempotent. NOTE: db:seed wipes app_user -> run import after seed.
- T3 done: legacy posts w/ no featured image = 0 real (only fictional seed sample); added cover fallback (first gallery img) in domain/articles.ts toArticle anyway. 0 covers set.
- T4 done: scripts/import-legacy-gallery.ts (pnpm db:import-legacy-gallery): 44 albums (published, scope = post district tag) / 182 photos approved, public copy via sharp -> MEDIA_ROOT/gallery/<id>-r0.jpg, orig -> media-private/gallery/orig. source="portal", from="legacy:<path>" is idempotency key. Idempotent. db:seed wipes gallery tables -> run after seed.
