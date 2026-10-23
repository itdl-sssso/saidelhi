# M6 frontend progress

Worktree `.claude/worktrees/agent-aa0e2d09be7795cf2`, branch `worktree-agent-aa0e2d09be7795cf2`, base `9ea319b`. Dev server :4300 (`.env.local` copied, `DATA_SOURCE=db`; state admin login +91 90000 00003, code in server log).

## Done
- Infra: `features/admin/parts.tsx` (Loadable, LinkTabs, Lang, Note, TogRow, TableFoot, Restricted, SafeIcon, IconDot), `fields.tsx` (I18nFields), `Parts.module.css`, icons added to `icons.ts`, nav: forms->`forms.read`, privacy->`privacy.read` alsoFor `privacy.manage`.
- Settings (49) `/admin/settings`: 6 tabs (seva types dialog, KPI dialog, strings inline HI, flags, link defaults+escalation, analytics).

## In progress
(none)

## Next
Wave A: forms (30), builder (31), uploads (33), centres (35), partners (36), volunteers (43), /dev/ui additions + helper tests. Wave B: 38, 40, 41, 44, 45, 46, 47, shell/nav, metadata.

## Decisions
- Pages are client-fetched (`useApi` on `adminEndpoints.*`) behind a server `page.tsx` that does `requirePortal` + permission + metadata, so they do not depend on `services()` in this worktree.
- Strings tab: `i18n/request.ts` override merge NOT done here (backend `loadOverrides` helper not in worktree) -> integration TODO.

## TEMP shims (remove at integration: `grep -rn "TEMP M6" src`)
- `src/features/admin/dev-fixtures.ts`, `dev-fixtures-load.ts`, `import "./dev-fixtures-load"` in `useApi.ts` + `useAction.ts`, and each `<x>/dev-fixtures.ts`: settings.

## HI review list (agent-written, needs native review)
- all `admin.settings.*`, new `admin.common.*` keys.

## Blockers
none
