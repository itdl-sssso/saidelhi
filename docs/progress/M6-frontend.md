# M6 frontend progress

Worktree `.claude/worktrees/agent-aa0e2d09be7795cf2`, branch `worktree-agent-aa0e2d09be7795cf2`, base `9ea319b`. Dev server :4300 (`.env.local` copied from main, `DATA_SOURCE=db`; state admin login +91 90000 00003, OTP code is in the dev server log: `grep login_code <log>`). `pnpm install --offline` works. Heredocs + git in one bash call get refused by the sandbox: use Write tool for files, `python3 - <<E` alone for edits.

## Done (typecheck, lint, tests/m6-frontend.test.ts green; full `pnpm test` + `pnpm build` NOT yet run)
- Infra: `features/admin/parts.tsx` (Loadable, LinkTabs `?tab=`, Lang, Note, TogRow, TableFoot, Restricted, SafeIcon, IconDot), `fields.tsx` (I18nFields/I18nValue/toI18n), `Parts.module.css`, many lucide icons added to `features/admin/icons.ts`, nav: forms -> `forms.read`, privacy -> `privacy.read` alsoFor `privacy.manage`, settings/forms `built`.
- Pattern for every M6 page: server `page.tsx` (`requirePortal(path, permission)` + `NoAccess` + `Streamed` + `generateMetadata` from `admin.<ns>.title`) -> client component using `useApi(adminEndpoints.x())`, `useAction().run(url,{method,body},{key,success,quiet422,onReload})`, `Loadable`. 422 field errors via `res.error.fields`.
- Settings (49) `/admin/settings`: tabs seva types (add/edit dialog, public switch, template select from `forms()`), KPIs (edit dialog), strings (search, Hindi-missing filter, inline HI input saves on blur, 422 placeholder error), flags, link defaults + escalation (save on change), analytics status. `src/features/admin/settings/SettingsPage.tsx`.
- Form templates (30) `/admin/forms`: change-requests panel (decline with note / start draft -> builder), template cards (version text, fields, Lang, events, missing-HI), Preview (phone frame dialog EN/HI, real `/f` field renderer via `FormFill`), versions dialog, Excel template download (`download()` blob helper exported from FormsPage.tsx), duplicate, new template, district "Request a change". `src/features/admin/forms/FormsPage.tsx`, `FormPreview.tsx`.
- Builder (31) `/admin/forms/[id]/edit`: palette, canvas with dnd-kit sortable (fields + repeater children, keyboard), locked fields (lock icon, no delete), section up/down/add/remove, settings panel (labels, help, required, min/max, options, show-if builder, cross-field check builder, warnAbove, KPI map, personal toggle + auto consent field + retention, ID-number inline error), bottom drawer (checks / Excel headers / WhatsApp bubbles), KPI-remove warning dialog, Test submission dialog (`FormTestResult`), publish gate (`builderChecks`+`canPublish`, reason text), debounced autosave (PATCH `{definition, version}`, 409 banner), phone = read-only preview. Files: `BuilderPage.tsx`, `BuilderCanvas.tsx`, `FieldSettings.tsx`, `BuilderDrawer.tsx`, `builder-model.ts` (pure, tested), `Builder.module.css`, `Forms.module.css`.

## Done in run 2 (typecheck + lint green; per-page commits)
- Partners (36) `features/admin/partners/PartnersPage.tsx` (add/edit dialog, kind filter, deactivate/reactivate via PATCH active, inactive filter `?active=0`).
- Volunteers (43) `features/admin/volunteers/VolunteersPage.tsx`: `ui/Meter` (new, in /dev/ui), expand-fetch signups, notify toggle in head (PATCH volunteerNotify), `org` options from server page.
- Centres (35) list `CentresPage.tsx` (samithi coord auto-redirect to own centre when `single`), editor `CentreEditor.tsx` (profile EN/HI, `PinPicker.tsx` Leaflet click/drag + lat/lng inputs, schedule rows, photos upload via `useUpload` + alt EN/HI, live preview aside, dirty guard, PATCH version).
- Uploads (33) history `UploadsPage.tsx` + wizard `UploadWizard.tsx` (5 steps, own-file to inbox, drop zone, preview table desktop / cards phone, confirm, errors.xlsx, no_changes alert, resume `?batch=<id>`, done tiles).
- New infra: `features/admin/useUpload.ts` (multipart POST with csrf), icons ChevronDown/Up/ImagePlus/Plus/X exported in `features/admin/icons.ts`, `Parts.module.css` vol* classes.
- Checked in browser (dev, :4300): partners (EN), volunteers (375px, no overflow), centres editor (leaflet mounts, 375px ok), wizard step 1. NOT visually checked: uploads preview/done steps, centres list, `/hi` of new pages. Dev session cookie kept dropping to login on full reloads; re-login with phone 9000000003 and OTP from log.
- Fixed ICU bug: no `<tag>` text in messages (partners.showPublicDesc).

## Done in run 3 (wave B; typecheck + eslint green; per-page commits; browser-checked EN desktop-width pane, no overflow: content list+editor, impact, migration (map step), health)
- Content (38): `features/admin/content/` `ContentPage.tsx` (tabs w/ counts, filters, New dialog, Create-from-event dialog, hide/unhide via GET+PATCH version, delete draft), `ArticleEditor.tsx` (`ContentEditorPage` switches article/item; EN/HI tabs, tiptap `RichEditor.tsx` with results-card node `div[data-event-results]`, image upload via `useUpload`, details panel, cover, schedule dialog, preview links, dirty guard), `ItemEditor.tsx`, `ThoughtsPage.tsx` (14-day grid, add/edit dialog, CSV import). Routes `/admin/content`, `/admin/content/[id]`, `/admin/content/thoughts`. Public `features/news/ArticleView.tsx` now renders `data-event-results` inline (`ResultsCard`), aside skipped when marker present.
- Impact (40): `impact/ImpactPage.tsx` (toggles, max-4 home, notes, estimates switch + tooltip, preview via KpiTile, estimates table + dialog + delete). Shared `features/admin/num.ts` (`formatNumber`).
- Migration (41): `migration/MigrationPage.tsx` (Stepper source/map/preview/import/report, tabs `?tab=redirects`), `RedirectsTab.tsx`. `features/admin/download.ts` (`download`, `downloadPost`; moved out of FormsPage).
- Reports (44): `reports/ReportsPage.tsx` (monthly panel + regenerate + auto toggle + recipient chips w/ people picker, export form -> CSV blob, recent, schedules).
- Health (45): `health/HealthPage.tsx` + new `ui/Heatmap` (table semantics, phone shows last 3 months, in /dev/ui).
- New TEMP fixtures: `content|impact|migration|reports|health|followup|privacy/dev-fixtures.ts` (registered in dev-fixtures-load.ts).
- Messages added (EN+HI, agent-written HI to review): `admin.content`, `admin.impact`, `admin.migration`, `admin.reports`, `admin.health`.

## Done in run 4 (typecheck + lint green; browser-checked EN/HI desktop-width pane, no overflow)
- Filter fix: `FilterField` select got `defaultValue` (shows real default, no "All" option/chip). Used by health `range` (6) and volunteers `when` (next30).
- Follow-up (46) `features/admin/followup/FollowUpPage.tsx`: restricted banner, filters (search, status default open, waiting 7/14/30+), table, Reveal button (only with `followup.reveal`, passed as `canReveal` from server page; number kept in component state 60 s, "Logged" pill), consent icon, late days highlight, SideSheet update panel (status, surgery date, note, history) + Log-a-call dialog, retention footnote, no export. Messages `admin.followup`.
- Privacy (47) `features/admin/privacy/PrivacyPage.tsx` + `BreachesTab.tsx`: tabs `?tab=` requests/consents/retention/breaches with count badges; request detail panel (due countdown, status select, 4-step checklist Find/Export (download json)/Delete (dialog with match checkboxes)/Reply (dialog)), consents (opt-in stats, by-form table, withdrawals), retention (switches, locked pill, read-only pill without `privacy.manage`), breaches (Start procedure dialog, 72 h countdown, step checklist with note dialog, affected, close when all steps done, all-breaches list), DPO panel (edit dialog when `can.editDpo`). Read-only alert when `!can.manage`. Page opens with `privacy.read` or `privacy.manage`. Messages `admin.privacy`.
- New TEMP fixtures: `followup|privacy/dev-fixtures.ts` (registered in dev-fixtures-load.ts).
- Not visually checked: follow-up/privacy dialogs at 375px, `/hi` follow-up, erase + reply dialogs.
- Assumed (tell lead): PATCH follow-up/call allowed with `followup.read` (no separate manage perm); export.json GET returns file; breach `steps` lists only done steps (missing = pending); privacy requests list called with `status: "all"`.

## In progress
(none)

## Next (in order)
Wave B pages all built. Remaining: `/hi` + 375px visual pass for all new pages, role matrix, i18n/request.ts loadOverrides merge, full `pnpm test` + `pnpm build`.

## Decisions
- Pages client-fetched (not `services()`), so no dependency on backend services in this worktree.
- Fixture shim intercepts only 404 from `/api/v1/admin/*` in dev; first load of a page waits for the lazy fixture chunk to compile (~10-20 s in dev), looks like a skeleton.
- Builder: new fields get temp id `f_xxxx`, renamed from the EN label (slug) until the id exists in a published version. Palette adds to the last-touched section. Repeater children limited to number/text/date/time/select/yesno.
- `FormPreview.FormFill` reusable (used by preview + test dialog).
- `tests/m6-frontend.test.ts` holds frontend helper tests (tests/ dir, as M5 did).

## TEMP shims (remove at integration: `grep -rn "TEMP M6" src`)
- `src/features/admin/dev-fixtures.ts`, `dev-fixtures-load.ts`, the `import "./dev-fixtures-load"` line in `useApi.ts` and `useAction.ts`, and per-page `settings|forms|partners|volunteers|centres|uploads|content|impact|migration|reports|health|followup|privacy/dev-fixtures.ts` (forms imports `@/server/forms/definitions`), `features/admin/useUpload.ts` imports dev-fixtures-load.

## HI review list (agent-written, needs native review)
- `admin.common` new keys, all `admin.settings.*`, `admin.forms.*`, `admin.builder.*`, `admin.partners.*`, `admin.volunteers.*`, `admin.centres.*`, `admin.uploads.*`, `admin.content|impact|migration|reports|health.*`, `admin.followup.*`, `admin.privacy.*`.

## Blockers
none. Open questions for lead: (1) Settings seva-type PATCH 422 shape for template mismatch assumed `fields.templateId`; (2) strings list `meta` assumed `{total,page,pageSize}`; (3) `FormTemplateDetail.version` assumed returned by PATCH (builder reads `res.data.version`).
