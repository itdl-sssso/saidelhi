# M6 backend progress

Branch: worktree-agent-a2704c9f933d0237a. Plan: docs/progress/M6-plan.md. Contract: CONTRACT.md §10 v0.7.
Tests: vitest has two projects (`vitest.config.mts`): `unit` (parallel) and `db` (`*.db.integration.test.ts`, one file at a time, globalSetup `tests/support/db-global-setup.ts` clears `otp_challenge` so OTP resend throttle never flakes). Back-to-back `pnpm test` is green. Run `pnpm db:seed` if a walkthrough mutated the DB.

## Done (wave A complete)
- 1+2 Schema/RBAC/settings plumbing + Settings API (49). Migrations `0006_m6_portal.sql` (15 doc tables + column adds on partner/impact_estimate/seva_type/privacy_request) and `0007_m6_form_rev.sql` (`form_version.published_by`, `rev`). Both applied to shared dev DB. `SettingsService` (`services/portal/settings.ts`), `services/kpis.ts`, `server/i18n/{messages,overrides}.ts` (`loadOverrides(locale)` cached, tag `ui-strings`), routes `/api/v1/admin/settings/**`. Link/OTP defaults from setting `links` (`loadLinkDefaults` in services/shared.ts; `otpPolicy` in otp.ts; link expiry in services/links.ts).
- 3 Forms (30-31): `services/portal/forms.ts`, `xlsx/template.ts`, routes `/admin/forms/**` (incl. change-requests, template.xlsx, versions). LinksRepo got version/template writes (`versionsOf`, `insertTemplate`, `insertVersion`, `updateDraft`, `publishDraft`, `activeLinkCounts`). Report template lookup honours `seva_type.template_id` (`reportTemplate` in links.ts).
- 4 Uploads (33): `services/portal/uploads.ts`, `xlsx/{sheet,sniff}.ts`, `http/multipart.ts`, `PrivateStorage.get`. Routes `/admin/uploads/**`.
- 5 Centres + Partners (35-36): `portal/centres.ts`, `portal/partners.ts`, `images.ts`, `ServiceDeps.publicMedia` (MEDIA_ROOT). Public partner filter (`showPublicly`) in event-assembler + programs. Routes `/admin/centres/**`, `/admin/partners/**`.
- 6 Volunteers (43): `portal/volunteers.ts`, template `volunteer_signup_alert`, hook `deps.onVolunteerSignup`. Routes `/admin/volunteers/**`.
- 7 Tests: `tests/m6-wave-a.test.ts`, `m6-uploads`, `m6-org`, `m6-volunteers`, `m6-contract`, `m6.db.integration` (+ `tests/support/m6.ts`). Seed clears M6 doc tables.

## Done (wave B so far)
- 9 Impact controls (40): `services/portal/impact-admin.ts` (`portal.impact`), routes `/admin/impact`, `/admin/impact/estimates[/:id]`; `M6Repo.estimates*` (insert/update/delete/all; `EstimateRec.period/createdBy/createdAt`). `services/kpis.ts`: `DEFAULT_HOME` (activities, people_served, blood.units, eye.spectacles = old Home tiles; `homeTile` seed true for those), `SYNTHETIC_KPIS` (activities/people_served/active toggles stored as `kpi_definition` rows), `loadKpiVisibility`. `loadSettings` now returns `hiddenKpis`, `homeTiles`, `estimateTooltip`; Home pads to exactly 4 tiles; `/impact` tiles + seva-type figures drop hidden keys; `estimateNote` uses tooltip. Impact setting version lives in setting `impact.version`. Tests in `tests/m6-wave-b.test.ts`.
- Test isolation: db project serial + OTP throttle cleanup (m5.db passes alone and in full runs).

## In progress
-

## Next (wave B, remaining)
- 8 Content (38; native `article` doc table exists in m6 schema, legacy copy-on-write, thoughts), 10 Migration (41), 11 Follow-up (46), 12 Privacy (47), 13 Reports+exports (44), 14 Health (45), tests for each in `tests/m6-wave-b.test.ts`; cron jobs (`publish-scheduled`, `monthly-report`, `retention`) in `services/portal/jobs.ts` + `/api/v1/jobs`.

## Decisions
- M6 tables = generic JSON document tables (`id,k1,k2,version,data,created_at,updated_at`), accessed through `repo.m6` (`docGet/docList/docInsert/docUpdate/docUpsert/docDelete`, optional audit rows in same txn). Lookup-key meaning per table in `repo/m6-types.ts`. Columns only added to existing tables.
- KPI definitions: seed in code (`domain/kpi.ts`) + overrides in `kpi_definition` (id=key); virtual version 1 until first edit. `homeTile` default false (wave B must keep current Home tiles).
- Default OTP attempts now 5 (contract LINK_DEFAULTS) instead of 3; links.test updated.
- Settings version = `settings_meta` setting row `{version}`.
- Report link expiry = event end (else start) + reportLinkDays; desk = start + 1 day (event_day) or +2 (event_day_plus_1).
- Privacy request routes follow `adminEndpoints` (`/admin/privacy/requests/...`), not the CONTRACT prose.
- Form builder: `FormTemplateDetail.version` / `FormDraftPatch.version` / publish `version` = draft revision counter (`form_version.rev`), not the definition version. PATCH parses the definition with zod server-side; only duplicate ids and removed/unlocked core fields are rejected on PATCH; other problems block publish (422 `fields` by field id or check key).
- Districts see published versions only (draft/versions hidden); `forms.read` can run the dry-run test and download templates.
- Uploads: row action update = existing planned/awaiting event (no report) or existing upload-sourced unapproved submission; other sources / approved → `duplicate_row` reject. Event for a new row: status awaiting_report at 10:00 IST on the date, source `upload`, locks the template version used in the preview, then `LinksService.submitExternal` (source `upload`) opens the district approval. CSV supported; BOM stripped. Header sanity: needs `date` + ≥5 expected headers else `wrong_template` (batch status `failed`).
- Centre photos stored as-is under `MEDIA_ROOT/centres/<id>/<ulid>.<ext>` (no sharp; EXIF not stripped, TODO).
- Volunteer notify preference default off (opt-in); `user_pref` doc id = user id.

## Blockers / contract proposals
- Proposal: document in CONTRACT.md that `FormTemplateDetail.version` is the draft revision counter (see decision above).
- Proposal: `VolunteerEventRow.event` is `EventCard` (no status) — fine; frontend may want `status` later.
