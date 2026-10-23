# M7 backend progress

## Run B1 (done)
- Migration `0008_m7_discourses.sql` (+ drizzle schema `src/server/db/schema/discourses.ts`): `discourse`, `discourse_block`, `discourse_glossary`. Applied to shared DB :3307.
- Repo port `repo/discourse-types.ts` (`DataRepo.discourses`: `published`, `publishedBySlug`, `glossary`; B2 adds writes), mock `discourse-mock.ts` (3 published + 1 draft synthetic fixtures in `mock/fixtures/discourses.ts`), db `discourse-db.ts` (list strips `blocks` via `JSON_SET`).
- Domain: `domain/discourse.ts` (`parseIsoDate`, `slugFromFile`, `locateQuote`, `themesFor`, `buildSnapshot` — reuse in B2 publish), `domain/discourse-import.ts` (file parsing, pure).
- Importer: `services/discourse-import.ts` (`importDiscourses`, `publishSamples`), CLI `scripts/import-discourses.ts` (`pnpm db:import-discourses [--dir] [--dry-run] [--publish-samples]`, dir = `DISCOURSES_DIR` | `--dir` | `~/Claude/sssso-platform/discourses`; folder with `translations/` or the translations folder itself). Seed (dev only) runs it with 3 samples published. Real import run on :3307: 87 discourses / 2491 blocks / 30 glossary; re-run = 0 changes; 3 have no catalog theme.
- Service `services/discourses.ts` (`list`, `bySlug`, `exists`, `forValue`); `values.bySlug` fills <=3. Routes `GET /api/v1/discourses`, `/discourses/[slug]` (404 flag off / unpublished).
- Flag: `DEFAULT_FLAGS.discourses = NODE_ENV === "development"`; fixture `flags` no longer sets it; stored setting still overrides. Cache tag `discourses` added; settings flag patch revalidates it.
- Proxy: probe for `/discourses/<slug>` (uncached) + `/discourses` list rewrite to not-found when flag off.
- Tests: `tests/m7-discourses.test.ts` (mock), `tests/m7.db.integration.test.ts` (n >= 900001, cleans up).

## Next (B2)
Workspace API per plan item 4. Snapshot = `Discourse` public shape via `buildSnapshot`; publish must also `revalidate(["discourses"])`. RBAC changes pending.
