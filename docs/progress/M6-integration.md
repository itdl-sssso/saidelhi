# M6 integration progress

Done
- Removed all TEMP M6 fixtures + `dev-fixtures-load` imports (useApi/useAction/useUpload).
- Shape check vs backend: form PATCH returns detail+rev version (ok), strings meta `{page,pageSize,total}` (ok), 422 key `templateId` (ok), follow-up PATCH/calls `followup.read` (ok), breach steps (all keys, doneAt null; UI handles both), HomePayload kpis padded to 4, follow-up counts unused by UI. Fixed: privacy requests list sent `status=all` (not in contract, matched nothing) -> param dropped.
- `src/i18n/request.ts` merges `loadOverrides(locale)` over shipped messages (try/catch fallback). Verified: strings PATCH shows on public page.
- Contract: `unmatched_url` in MigrationProblem (service, test, EN/HI strings); CONTRACT.md v0.7.1.
- Smoke (:4400, DATA_SOURCE=db): state admin, district coord, PII officer. All /admin pages EN+/hi 200; admin API sweep 200; district coord 403 on settings/content/impact/migration/follow-up/privacy; PII officer 200 only on follow-up + privacy. Browser 375px: all state-admin pages render, no console errors. Form draft PATCH round trip ok (versions 1, 2).
- DoD green: typecheck, lint, test (340), build.

Open
- `PrivacyRequestRow.ref` still derived (not stored); fine while requests never deleted.
- Browser pane hidden throttles hydration; needs screenshot to wake.
- Hindi PDF, EXIF strip, redirects cache lag (see CONTRACT v0.7.1).
