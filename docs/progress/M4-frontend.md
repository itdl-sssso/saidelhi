# M4 frontend progress

Worktree `.claude/worktrees/agent-ab1cd63aea1a4f2b9`, branch `worktree-agent-a4b97a7b39548f876`, base `5272d93`.

## Done (all 4 tasks + DoD green: typecheck, lint, test 153, build)
- Task 1 Review inbox `/admin/inbox`, `/admin/inbox/[id]` (`src/features/admin/inbox/*`). Client-fetched via `useApi`.
- Task 2 WhatsApp admin `/admin/whatsapp` (`src/features/admin/whatsapp/*`), nav `alsoFor` for `whatsapp.reminders`.
- Task 3 Dev simulator `/dev/whatsapp` (`src/features/dev/Simulator.tsx`), 404 in production (checked on `next start`).
- Task 4 backlog: (a) event page `approvedOn` + `centre.slug` link; (b) calendar filter options from `endpoints.orgUnits` (server options remain as fallback), recurring rows link to the centre; (c) admin: unbuilt sections are static routes (no `[section]` catch-all) so unknown `/admin/<x>` is a real 404 (dev + prod verified); (d) login uses `src/ui/OtpInput`, `OtpBoxes` deleted.
- 375px (scrollWidth == clientWidth) and `/hi` checked for inbox, item, 5 WhatsApp tabs, simulator.

## Decisions
- Inbox/WhatsApp pages fetch on the client (`useApi`, `src/features/admin/useApi.ts`) so they do not depend on backend services in this branch; keeps `meta` of list envelopes (src/lib/api.ts drops it).
- DEV-ONLY fixture shim, remove after backend merge (`grep -rn devFixture src`): `src/features/admin/devFixture.ts`, `useApi` fixture arg, `useAction` `devFixture`/`onReload` options (onReload is real, keep), `src/features/admin/inbox/__fixtures__`, `src/features/admin/whatsapp/__fixtures__`, `public/dev/register-scan.svg`, canned reply branch in `Simulator.tsx`.
- `FieldRenderer` got optional `ctx.marks` (AI confidence notes: icon + text + left rule) for the inbox draft.
- Local worktree `.env.local` (untracked): `DATA_SOURCE=db` (mock repo state is per-bundle in dev, login does not carry to pages), `EXTRACTOR_PROVIDER=stub`.

## Open / not done
- HTTP 404 for unknown public ids/slugs (`/events/<x>`, `/centres/<x>`): works in `next dev` when the page awaits the lookup outside Suspense and `loading.tsx` is removed, but `next start` still answers 200 because `(public)/layout.tsx` wraps SiteHeader in Suspense (static shell fixes the status). Reverted to the original pages. Needs a Proxy check (src/proxy.ts) or a layout change; not done.
- Unknown ids in the portal (`/admin/events/<x>`) also stay 200 (portal layout Suspense).
- `admin.login.codeLabel` message is now unused.
