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

## Run B2 (done)
- Repo port += `adminRows`, `byId`, `maxN`, `slugs`, `insert`, `update(id, expectVersion, {rec, blocks}, audit)` (mock + db, audit in same tx). Mock repo now pushes audit via portal.
- Public read now keys on live `published_snapshot` (not `status`): editing a published discourse sets status `in_review`, public keeps serving the snapshot until re-publish; unpublish clears snapshot.
- Service `services/portal/discourses.ts` (`services().portal.discourses`): list/get/create/patch/aiDraft/sendReview/approve/publish/unpublish/glossary. Routes under `src/app/api/v1/admin/discourses/**` (glossary static route before `[id]`).
- RBAC: translator = edit+review; content_editor += edit, review, publish; state all. Perms: list/get/patch/create/ai-draft/send-review = edit; approve + block `approved` + `reviewerId` patch = review; publish/unpublish = publish.
- Errors: stale version 409; 422 `fields`: `blocks.<i>`, `quotes.<i>`, `quotes`, `blocks`, `reviewerId`, `flag_off`, `not_approved`, `slug`, `sourceText`, `status`. Publish writes snapshot+publishedAt, `revalidate(["discourses"])` (also on unpublish). Audit `discourse.{create,update,ai_draft,send_review,approve,publish,unpublish}` (ids/field names only, no text).
- Tests: `tests/m7-workspace.test.ts` (mock), `tests/m7-workspace.db.integration.test.ts` (rows slug `ws-test-*`, n>=900011, cleaned).
- No glossary CRUD (not in contract).
