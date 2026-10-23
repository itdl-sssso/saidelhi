# M6 frontend progress

Worktree `.claude/worktrees/agent-aa0e2d09be7795cf2`, branch `worktree-agent-aa0e2d09be7795cf2`, base `9ea319b`. Dev server :4300 (`.env.local` copied from main, `DATA_SOURCE=db`; state admin login +91 90000 00003, OTP code is in the dev server log: `grep login_code <log>`). `pnpm install --offline` works. Heredocs + git in one bash call get refused by the sandbox: use Write tool for files, `python3 - <<E` alone for edits.

## Done (typecheck, lint, tests/m6-frontend.test.ts green; full `pnpm test` + `pnpm build` NOT yet run)
- Infra: `features/admin/parts.tsx` (Loadable, LinkTabs `?tab=`, Lang, Note, TogRow, TableFoot, Restricted, SafeIcon, IconDot), `fields.tsx` (I18nFields/I18nValue/toI18n), `Parts.module.css`, many lucide icons added to `features/admin/icons.ts`, nav: forms -> `forms.read`, privacy -> `privacy.read` alsoFor `privacy.manage`, settings/forms `built`.
- Pattern for every M6 page: server `page.tsx` (`requirePortal(path, permission)` + `NoAccess` + `Streamed` + `generateMetadata` from `admin.<ns>.title`) -> client component using `useApi(adminEndpoints.x())`, `useAction().run(url,{method,body},{key,success,quiet422,onReload})`, `Loadable`. 422 field errors via `res.error.fields`.
- Settings (49) `/admin/settings`: tabs seva types (add/edit dialog, public switch, template select from `forms()`), KPIs (edit dialog), strings (search, Hindi-missing filter, inline HI input saves on blur, 422 placeholder error), flags, link defaults + escalation (save on change), analytics status. `src/features/admin/settings/SettingsPage.tsx`.
- Form templates (30) `/admin/forms`: change-requests panel (decline with note / start draft -> builder), template cards (version text, fields, Lang, events, missing-HI), Preview (phone frame dialog EN/HI, real `/f` field renderer via `FormFill`), versions dialog, Excel template download (`download()` blob helper exported from FormsPage.tsx), duplicate, new template, district "Request a change". `src/features/admin/forms/FormsPage.tsx`, `FormPreview.tsx`.
- Builder (31) `/admin/forms/[id]/edit`: palette, canvas with dnd-kit sortable (fields + repeater children, keyboard), locked fields (lock icon, no delete), section up/down/add/remove, settings panel (labels, help, required, min/max, options, show-if builder, cross-field check builder, warnAbove, KPI map, personal toggle + auto consent field + retention, ID-number inline error), bottom drawer (checks / Excel headers / WhatsApp bubbles), KPI-remove warning dialog, Test submission dialog (`FormTestResult`), publish gate (`builderChecks`+`canPublish`, reason text), debounced autosave (PATCH `{definition, version}`, 409 banner), phone = read-only preview. Files: `BuilderPage.tsx`, `BuilderCanvas.tsx`, `FieldSettings.tsx`, `BuilderDrawer.tsx`, `builder-model.ts` (pure, tested), `Builder.module.css`, `Forms.module.css`.

## In progress
(none; stopped at context limit after builder)

## Next (in order)
Wave A rest: uploads (33) `/admin/uploads` + `/admin/uploads/new` stepper (uploadOptions, template download, drop zone with `UPLOAD_LIMITS` via `ui/FileUpload` or plain input, preview table `UploadPreview`, confirm, errors.xlsx, result tiles/no_changes, history table); centres (35) list + `[id]` (Leaflet pin picker: reuse `src/features/map`, schedule rows, photos multipart `centrePhotos`, preview card, version save); partners (36); volunteers (43) (+ `notify` toggle, expand fetch); `/dev/ui` additions (Stepper exists; Heatmap, Meter); fixtures for each page in `<x>/dev-fixtures.ts` + register in `dev-fixtures-load.ts`.
Wave B: content (38) tiptap editor + thoughts calendar + public article results-card render, impact (40), migration (41), reports (44), health (45), follow-up (46), privacy (47), shell/nav polish, metadata, HI for everything.
Also: `i18n/request.ts` merge `loadOverrides(locale)` (backend helper), 375px + `/hi` pass for every page (use JS `document.documentElement.scrollWidth`), role matrix, `pnpm build`.

## Decisions
- Pages client-fetched (not `services()`), so no dependency on backend services in this worktree.
- Fixture shim intercepts only 404 from `/api/v1/admin/*` in dev; first load of a page waits for the lazy fixture chunk to compile (~10-20 s in dev), looks like a skeleton.
- Builder: new fields get temp id `f_xxxx`, renamed from the EN label (slug) until the id exists in a published version. Palette adds to the last-touched section. Repeater children limited to number/text/date/time/select/yesno.
- `FormPreview.FormFill` reusable (used by preview + test dialog).
- `tests/m6-frontend.test.ts` holds frontend helper tests (tests/ dir, as M5 did).

## TEMP shims (remove at integration: `grep -rn "TEMP M6" src`)
- `src/features/admin/dev-fixtures.ts`, `dev-fixtures-load.ts`, the `import "./dev-fixtures-load"` line in `useApi.ts` and `useAction.ts`, and per-page `settings/dev-fixtures.ts`, `forms/dev-fixtures.ts` (imports `@/server/forms/definitions`).

## HI review list (agent-written, needs native review)
- `admin.common` new keys, all `admin.settings.*`, `admin.forms.*`, `admin.builder.*`.

## Blockers
none. Open questions for lead: (1) Settings seva-type PATCH 422 shape for template mismatch assumed `fields.templateId`; (2) strings list `meta` assumed `{total,page,pageSize}`; (3) `FormTemplateDetail.version` assumed returned by PATCH (builder reads `res.data.version`).
